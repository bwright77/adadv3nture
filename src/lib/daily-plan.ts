import { supabase } from './supabase'
import { logicalToday, mondayOf, addDaysStr } from './utils'
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
  adventure_done: boolean
  adventure_note: string | null
  adventure_category: string | null
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
// Career projects (WA opportunities, shown on the Career tab) → career.
// EVERYTHING else in the Projects tab — art, software, the truck (FJ62),
// a "home"-tagged project, other — is a side project → the Projects slot.
// The project's category is just a label/colour, NOT a life-category: house
// work (Birch St / Yellow House) lives in the Home *todo* list, never as a
// project, so a project must never credit the Home MIT.
export function mapProjectCategoryToMIT(cat: string): ReviewCategory {
  if (cat === 'career') return 'career'
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
    .select('id, plan_date, morning_briefing, briefing_generated_at, thinking_prompt, thinking_prompt_answer, drinks_today, family_creative_done, family_creative_note, home_done, home_note, career_done, career_note, projects_done, projects_note, adventure_done, adventure_note, adventure_category')
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
}

// Default per-category cadence in days — how often each MIT slot is expected
// to be touched. Career counts only weekday gaps (Mon–Fri, weekends skipped).
// Override via users.briefing_profile.category_cadence_days.
export const DEFAULT_CADENCE: Record<ReviewCategory, number> = {
  career: 3,
  family_creative: 2,
  home: 5,
  projects: 5,
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

  return {
    yesterday: rows[0] ?? null,
    pilotLights,
  }
}

// ─── Cadence-aware MIT freshness ─────────────────────────────────────────
// Each category has its own expected interval (career midweek-only, family
// every other day, home/projects weekend-weighted). "Lit" = within interval,
// "dark" = past it. No aggregate % — uniform-quota framing was the wrong
// shape (career on Saturdays isn't progress, projects on Tuesdays isn't
// either).

export interface CategoryFreshness {
  category: ReviewCategory
  daysSinceLastDone: number    // weekday-only counter for career
  cadenceDays: number
  isDark: boolean              // past the cadence interval
}

export interface MITCadence {
  freshness: CategoryFreshness[]
  cadence: Record<ReviewCategory, number>
}

// Reads cadence overrides from users.briefing_profile.category_cadence_days,
// falling back to DEFAULT_CADENCE for any missing keys.
async function loadCadence(userId: string): Promise<Record<ReviewCategory, number>> {
  const { data } = await supabase
    .from('users')
    .select('briefing_profile')
    .eq('id', userId)
    .maybeSingle() as { data: { briefing_profile: { category_cadence_days?: Partial<Record<ReviewCategory, number>> } | null } | null }
  const override = data?.briefing_profile?.category_cadence_days ?? {}
  return {
    career:          override.career          ?? DEFAULT_CADENCE.career,
    family_creative: override.family_creative ?? DEFAULT_CADENCE.family_creative,
    home:            override.home            ?? DEFAULT_CADENCE.home,
    projects:        override.projects        ?? DEFAULT_CADENCE.projects,
  }
}

export async function getMITCadence(userId: string): Promise<MITCadence> {
  const today = logicalToday()
  const [{ data: rows }, cadence] = await Promise.all([
    supabase
      .from('daily_plans')
      .select('plan_date, family_creative_done, home_done, career_done, projects_done')
      .eq('user_id', userId)
      .lt('plan_date', today)
      .order('plan_date', { ascending: false })
      .limit(30) as unknown as { data: ReviewRow[] | null },
    loadCadence(userId),
  ])

  const list = rows ?? []
  const freshness: CategoryFreshness[] = REVIEW_CATS.map(cat => {
    let days = 0
    for (const row of list) {
      if (row[`${cat}_done` as keyof ReviewRow]) break
      if (cat === 'career' && isWeekendDate(row.plan_date)) continue
      days++
    }
    const cadenceDays = cadence[cat]
    return {
      category: cat,
      daysSinceLastDone: days,
      cadenceDays,
      isDark: days >= cadenceDays,
    }
  })
  return { freshness, cadence }
}

// ─── WA week ring ────────────────────────────────────────────────────────
// Summer watcher: "real WA progress 5×/week." Derived from career_done (Ben's
// career work is effectively WA right now) — count the days this ISO week the
// career MIT was touched, capped at the 5-weekday target. No new schema.
export interface WAWeekProgress {
  done: number          // career_done days this week (capped at target)
  target: number        // 5
  weekStart: string     // Monday (YYYY-MM-DD)
}

export async function getWAWeekProgress(userId: string): Promise<WAWeekProgress> {
  const today = logicalToday()
  const weekStart = mondayOf(today)
  const { data } = await supabase
    .from('daily_plans')
    .select('plan_date, career_done')
    .eq('user_id', userId)
    .gte('plan_date', weekStart)
    .lte('plan_date', today) as unknown as { data: { plan_date: string; career_done: boolean }[] | null }

  const done = (data ?? []).filter(r => r.career_done).length
  return { done: Math.min(done, 5), target: 5, weekStart }
}

// ─── Cross-day backfill ────────────────────────────────────────────────────
// "Completeness, not enforcement." Missing MOOD is the honest flag that a day
// went unlogged (the one true subjective entry no sensor fills). Surface those
// past days as an invitation to fill — never a gate. Returns open days within
// the lookback window, most-recent first, today excluded (today is in progress).
export async function getOpenDays(userId: string, lookbackDays = 10): Promise<string[]> {
  const today = logicalToday()
  const dates: string[] = []
  for (let i = 1; i <= lookbackDays; i++) dates.push(addDaysStr(today, -i))   // today-1 … today-N

  const { data } = await supabase
    .from('daily_plans')
    .select('plan_date, mood_score')
    .eq('user_id', userId)
    .gte('plan_date', dates[dates.length - 1])
    .lt('plan_date', today) as unknown as { data: { plan_date: string; mood_score: number | null }[] | null }

  const moodByDate = new Map((data ?? []).map(r => [r.plan_date, r.mood_score]))
  return dates.filter(d => (moodByDate.get(d) ?? null) === null)
}

export async function saveThinkingAnswer(userId: string, answer: string): Promise<void> {
  const today = logicalToday()
  await db.from('daily_plans').upsert(
    { user_id: userId, plan_date: today, thinking_prompt_answer: answer },
    { onConflict: 'user_id,plan_date' },
  )
}
