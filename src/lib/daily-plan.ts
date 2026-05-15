import { supabase } from './supabase'
import { logicalToday } from './utils'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface DailyPlan {
  id: string
  plan_date: string
  morning_briefing: string | null
  briefing_generated_at: string | null
  thinking_prompt: string | null
  thinking_prompt_answer: string | null
  drinks_today: number
  family_creative_done: boolean
  family_creative_note: string | null
  home_done: boolean
  home_note: string | null
  career_done: boolean
  career_note: string | null
  projects_done: boolean
  projects_note: string | null
}

export type ReviewCategory = 'family_creative' | 'home' | 'career' | 'projects'

export async function updateReviewRow(
  userId: string,
  category: ReviewCategory,
  done: boolean,
  note: string,
  date?: string,
): Promise<void> {
  const planDate = date ?? logicalToday()
  await db.from('daily_plans').upsert(
    {
      user_id: userId,
      plan_date: planDate,
      [`${category}_done`]: done,
      [`${category}_note`]: note || null,
    },
    { onConflict: 'user_id,plan_date' },
  )
}

export async function getTodayPlan(userId: string): Promise<DailyPlan | null> {
  return getPlanForDate(userId, logicalToday())
}

export async function getPlanForDate(userId: string, date: string): Promise<DailyPlan | null> {
  const { data } = await supabase
    .from('daily_plans')
    .select('id, plan_date, morning_briefing, briefing_generated_at, thinking_prompt, thinking_prompt_answer, drinks_today, family_creative_done, family_creative_note, home_done, home_note, career_done, career_note, projects_done, projects_note')
    .eq('user_id', userId)
    .eq('plan_date', date)
    .maybeSingle() as unknown as { data: DailyPlan | null }
  return data
}

/**
 * A review is "incomplete" if any user-controlled MIT row is missing both a
 * done flag and a note. Each row needs at least one to count as filled.
 * BODY is excluded because it's auto-derived from Strava.
 */
export function isPlanReviewIncomplete(plan: DailyPlan | null, hideCareer = false): boolean {
  const cats: ReviewCategory[] = hideCareer
    ? ['family_creative', 'home', 'projects']
    : ['family_creative', 'home', 'career', 'projects']
  if (!plan) return true
  for (const cat of cats) {
    const done = plan[`${cat}_done` as keyof DailyPlan]
    const note = plan[`${cat}_note` as keyof DailyPlan]
    const hasNote = typeof note === 'string' && note.trim().length > 0
    if (!done && !hasNote) return true
  }
  return false
}

export interface PilotLights {
  family_creative: number
  home: number
  career: number
  projects: number
}

export interface ReviewHistory {
  yesterday: {
    family_creative_done: boolean
    home_done: boolean
    career_done: boolean
    projects_done: boolean
    family_creative_note: string | null
    home_note: string | null
    career_note: string | null
    projects_note: string | null
  } | null
  pilotLights: PilotLights
  completionRate7d: number
}

type ReviewRow = {
  plan_date: string
  family_creative_done: boolean
  home_done: boolean
  career_done: boolean
  projects_done: boolean
  family_creative_note: string | null
  home_note: string | null
  career_note: string | null
  projects_note: string | null
}

const REVIEW_CATS = ['family_creative', 'home', 'career', 'projects'] as const

export async function getReviewHistory(userId: string): Promise<ReviewHistory> {
  const today = logicalToday()
  const { data } = await supabase
    .from('daily_plans')
    .select('plan_date, family_creative_done, home_done, career_done, projects_done, family_creative_note, home_note, career_note, projects_note')
    .eq('user_id', userId)
    .lt('plan_date', today)
    .order('plan_date', { ascending: false })
    .limit(14)

  const rows = (data ?? []) as ReviewRow[]

  // Days since last done per category (0 = done yesterday)
  const pilotLights = {} as PilotLights
  for (const cat of REVIEW_CATS) {
    let days = 0
    for (const row of rows) {
      if (row[`${cat}_done` as keyof ReviewRow]) break
      days++
    }
    pilotLights[cat] = days
  }

  // 7-day completion rate across all four categories
  const last7 = rows.slice(0, 7)
  let total = 0, done = 0
  for (const row of last7) {
    for (const cat of REVIEW_CATS) {
      total++
      if (row[`${cat}_done` as keyof ReviewRow]) done++
    }
  }

  return {
    yesterday: rows[0] ?? null,
    pilotLights,
    completionRate7d: total > 0 ? done / total : 0,
  }
}

export interface MITStats {
  rate7d: number          // 0..1 completion rate over the last 7 days (incl. today)
  deltaVsPrior: number    // percentage-point change vs the prior 7-day window
  last5Days: boolean[]    // [today-4 ... today], true if that day had ≥ 3 of 4 done
}

export async function getMITStats(userId: string): Promise<MITStats> {
  const today = logicalToday()
  const todayDate = new Date(today + 'T12:00:00')
  const start = new Date(todayDate)
  start.setDate(todayDate.getDate() - 13)
  const startStr = start.toISOString().substring(0, 10)

  const { data } = await supabase
    .from('daily_plans')
    .select('plan_date, family_creative_done, home_done, career_done, projects_done')
    .eq('user_id', userId)
    .gte('plan_date', startStr)
    .lte('plan_date', today)

  const rows = (data ?? []) as ReviewRow[]
  const byDate = new Map<string, number>()
  for (const row of rows) {
    let n = 0
    for (const cat of REVIEW_CATS) if (row[`${cat}_done` as keyof ReviewRow]) n++
    byDate.set(row.plan_date, n)
  }

  const counts: number[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(todayDate)
    d.setDate(todayDate.getDate() - i)
    counts.push(byDate.get(d.toISOString().substring(0, 10)) ?? 0)
  }

  const prior7 = counts.slice(0, 7)
  const last7 = counts.slice(7, 14)
  const rate = (xs: number[]) => xs.reduce((s, n) => s + n, 0) / (xs.length * 4)
  const rate7d = rate(last7)
  const deltaVsPrior = Math.round((rate7d - rate(prior7)) * 100)
  const last5Days = counts.slice(9, 14).map(n => n >= 3)

  return { rate7d, deltaVsPrior, last5Days }
}

export async function saveThinkingAnswer(userId: string, answer: string): Promise<void> {
  const today = logicalToday()
  await db.from('daily_plans').upsert(
    { user_id: userId, plan_date: today, thinking_prompt_answer: answer },
    { onConflict: 'user_id,plan_date' },
  )
}
