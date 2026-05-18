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

// Career is the only category that's weekday-only by design — weekends breathe
// (CLAUDE.md rule #4 / weekend-mode). Treat Sat/Sun Career as N/A, not "missed."
export function isWeekendDate(dateStr: string): boolean {
  const dow = new Date(dateStr + 'T12:00:00').getDay()
  return dow === 0 || dow === 6
}

export function applicableCategoriesForDate(dateStr: string): ReviewCategory[] {
  return isWeekendDate(dateStr)
    ? ['family_creative', 'home', 'projects']
    : ['family_creative', 'home', 'career', 'projects']
}

// Route a project's category to the MIT slot it should register against.
// Career projects (opportunities) → career; home projects → home; everything
// else (art, software, other) → the catch-all projects slot.
export function mapProjectCategoryToMIT(cat: string): ReviewCategory {
  if (cat === 'career') return 'career'
  if (cat === 'home') return 'home'
  return 'projects'
}

// Route a todo's category to the MIT slot. Body has no MIT slot — that row
// is derived from Strava, not manually checked off.
export function mapTodoCategoryToMIT(cat: string): ReviewCategory | null {
  if (cat === 'family') return 'family_creative'
  if (cat === 'home') return 'home'
  if (cat === 'career') return 'career'
  if (cat === 'projects') return 'projects'
  return null
}

interface RegisterMITActivityArgs {
  userId: string
  category: ReviewCategory
  markDone: boolean
  note?: string | null
}

/**
 * Hook for user actions that should auto-register against today's MIT row:
 *   - Project milestone checked off  → markDone=true, note=milestone title
 *   - Project update logged          → markDone=false, note=update text
 *   - Family/home/career/projects todo completed → markDone=true, note=todo title
 *   - 50 Hikes hike marked done      → markDone=true, note='Hike: <title>'
 *
 * Additive semantics: done is monotonic (true wins), notes append with ' · '
 * unless the new text is already a substring of the existing note. Never
 * unsets — undoing a completion in the source UI doesn't reverse the MIT
 * contribution.
 */
export async function registerMITActivity({
  userId, category, markDone, note,
}: RegisterMITActivityArgs): Promise<void> {
  const planDate = logicalToday()
  const existing = await getPlanForDate(userId, planDate)
  const currentDone = existing ? Boolean(existing[`${category}_done` as keyof DailyPlan]) : false
  const currentNote = existing ? ((existing[`${category}_note` as keyof DailyPlan] as string | null) ?? '') : ''

  const newDone = currentDone || markDone
  const incoming = note?.trim() ?? ''
  let newNote = currentNote
  if (incoming && !currentNote.includes(incoming)) {
    newNote = currentNote ? `${currentNote} · ${incoming}` : incoming
  }

  if (newDone === currentDone && newNote === currentNote) return
  await updateReviewRow(userId, category, newDone, newNote, planDate)
}

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
 * A review is "incomplete" if any *applicable* MIT row is missing both a
 * done flag and a note. Each row needs at least one to count as filled.
 * BODY is excluded because it's auto-derived from Strava.
 * Career is excluded on weekends — see applicableCategoriesForDate.
 */
export function isPlanReviewIncomplete(plan: DailyPlan | null): boolean {
  if (!plan) return true
  const cats = applicableCategoriesForDate(plan.plan_date)
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

  // Days since last done per category. Career counts weekday gaps only so
  // Saturday and Sunday don't tick the light dark on Monday morning.
  const pilotLights = {} as PilotLights
  for (const cat of REVIEW_CATS) {
    let days = 0
    for (const row of rows) {
      if (row[`${cat}_done` as keyof ReviewRow]) break
      if (cat === 'career' && isWeekendDate(row.plan_date)) continue
      days++
    }
    pilotLights[cat] = days
  }

  // 7-day completion rate — denominator counts only categories that are
  // applicable on each day (Career excluded on Sat/Sun), so a perfectly
  // executed weekend doesn't drag the rate down.
  const last7 = rows.slice(0, 7)
  let total = 0, done = 0
  for (const row of last7) {
    for (const cat of applicableCategoriesForDate(row.plan_date)) {
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
  // For each date in the 14-day window, track (done, applicable) so weekend
  // Career doesn't inflate the denominator. A weekend day is 3-cell, weekday 4-cell.
  type DayCounts = { done: number; applicable: number }
  const byDate = new Map<string, DayCounts>()
  for (const row of rows) {
    let done = 0
    const cats = applicableCategoriesForDate(row.plan_date)
    for (const cat of cats) if (row[`${cat}_done` as keyof ReviewRow]) done++
    byDate.set(row.plan_date, { done, applicable: cats.length })
  }

  const days: { date: string; done: number; applicable: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(todayDate)
    d.setDate(todayDate.getDate() - i)
    const date = d.toISOString().substring(0, 10)
    const cell = byDate.get(date)
    days.push({
      date,
      done: cell?.done ?? 0,
      applicable: cell?.applicable ?? applicableCategoriesForDate(date).length,
    })
  }

  const rate = (xs: typeof days) => {
    const totDone = xs.reduce((s, d) => s + d.done, 0)
    const totAppl = xs.reduce((s, d) => s + d.applicable, 0)
    return totAppl > 0 ? totDone / totAppl : 0
  }
  const prior7 = days.slice(0, 7)
  const last7 = days.slice(7, 14)
  const rate7d = rate(last7)
  const deltaVsPrior = Math.round((rate7d - rate(prior7)) * 100)
  // A day is "lit" if at least 75% of applicable cells are done.
  const last5Days = days.slice(9, 14).map(d => d.applicable > 0 && d.done / d.applicable >= 0.75)

  return { rate7d, deltaVsPrior, last5Days }
}

export async function saveThinkingAnswer(userId: string, answer: string): Promise<void> {
  const today = logicalToday()
  await db.from('daily_plans').upsert(
    { user_id: userId, plan_date: today, thinking_prompt_answer: answer },
    { onConflict: 'user_id,plan_date' },
  )
}
