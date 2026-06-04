import { supabase } from './supabase'
import { logicalToday, mondayOf, addDaysStr } from './utils'
import { registerMITActivity } from './daily-plan'
import { isBikeActivity } from './trends'
import { haversineMi } from './locations'
import type { Database } from '../types/database'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export type Adventure = Database['public']['Tables']['adventures']['Row']
export type AdventureCategory = Adventure['category']

export const ADVENTURE_META: Record<AdventureCategory, { label: string; emoji: string }> = {
  pool:       { label: 'Pool',       emoji: '🏊' },
  fishing:    { label: 'Fishing',    emoji: '🎣' },
  library:    { label: 'Library',    emoji: '📚' },
  parks:      { label: 'Parks',      emoji: '🌳' },
  museum:     { label: 'Museum',     emoji: '🏛️' },
  bouldering: { label: 'Bouldering', emoji: '🧗' },
  creek:      { label: 'Creek',      emoji: '🏞️' },
  hike:       { label: 'Hike',       emoji: '🥾' },
  other:      { label: 'Adventure',  emoji: '✨' },
}

export const ADVENTURE_CATEGORIES = Object.keys(ADVENTURE_META) as AdventureCategory[]

export async function getAdventures(userId: string): Promise<Adventure[]> {
  const { data } = await supabase
    .from('adventures')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('name') as unknown as { data: Adventure[] | null }
  return data ?? []
}

// ─── Suggester v1 — context-aware, hand-fed (no scoring yet) ───────────────
// Tiered pools mirror useFamilyHikes.suggestHike(): prefer the current place + a
// weather-clear + in-season option, then relax constraints one tier at a time.
export interface SuggestContext {
  monthAbbr: string          // 'Jun' — current month, matched against best_months
  placeSlug: string | null   // current resolved location slug
  coords: { lat: number; lon: number } | null   // current GPS, for reachability
  afternoonWet: boolean      // demote outdoor options when the afternoon's wet
  highF: number | null       // demote water options when it's cool
}

// Beyond this, a place isn't "today's adventure" — it's a road trip. The catalog
// is Denver-area, so this naturally suggests nothing when you're in Howard etc.
// (the hero then degrades to "Pick something and get out") rather than offering
// a 2-hour-away park.
const MAX_ADVENTURE_MILES = 75

export function suggestAdventure(catalog: Adventure[], ctx: SuggestContext): Adventure | null {
  if (!catalog.length) return null
  const weatherOk = (a: Adventure): boolean => {
    if (ctx.afternoonWet && a.setting === 'outdoor') return false
    if (a.is_water && ctx.highF != null && ctx.highF < 72) return false
    return true
  }
  const inSeason = (a: Adventure): boolean => !a.best_months?.length || a.best_months.includes(ctx.monthAbbr)
  const atPlace = (a: Adventure): boolean => ctx.placeSlug != null && a.place_slug === ctx.placeSlug
  // Reachable today? A placeless idea (no coords — e.g. an indoor/family thing)
  // travels with you. A geo-located spot must be within range of where we are.
  // When we don't know where we are, don't over-filter.
  const nearby = (a: Adventure): boolean => {
    if (a.latitude == null || a.longitude == null) return true
    if (!ctx.coords) return true
    return haversineMi(ctx.coords, { lat: a.latitude, lon: a.longitude }) <= MAX_ADVENTURE_MILES
  }

  // Place is a hard gate (no more serving a far-away spot just because the
  // weather's nice); within reachable options, prefer here > clear+in-season >
  // clear > anything reachable. No global catch-all — nothing nearby ⇒ null.
  const tiers: ((a: Adventure) => boolean)[] = [
    a => atPlace(a) && weatherOk(a) && inSeason(a),
    a => nearby(a) && weatherOk(a) && inSeason(a),
    a => nearby(a) && weatherOk(a),
    a => nearby(a),
  ]
  for (const pass of tiers) {
    const pool = catalog.filter(pass)
    if (pool.length) return pool[0]
  }
  return null
}

// ─── Two-tier completion log ───────────────────────────────────────────────
export interface LogAdventureArgs {
  userId: string
  date: string                  // the day it's ABOUT (time-agnostic entry)
  category: AdventureCategory
  adventureId?: string | null
  isReal: boolean               // the weekly "real adventure" star (manual)
  rating?: number | null
  relief?: string | null
  note?: string | null
}

export async function logAdventure(args: LogAdventureArgs): Promise<void> {
  const { userId, date, category, adventureId, isReal, rating, relief, note } = args

  // Tier 1: the daily "we got out" heartbeat — accrete only the adventure columns.
  await db.from('daily_plans').upsert(
    {
      user_id: userId,
      plan_date: date,
      adventure_done: true,
      adventure_note: note ?? null,
      adventure_category: category,
    },
    { onConflict: 'user_id,plan_date' },
  )

  // Tier 2: durable season memory artifact (heat-map reads this).
  await db.from('adventure_log').insert({
    user_id: userId,
    adventure_id: adventureId ?? null,
    done_date: date,
    category,
    is_real: isReal,
    relief: relief ?? null,
    family_rating: rating ?? null,
    notes: note ?? null,
  })

  // Adventure counts as family presence on today's MIT row (hike→family precedent).
  if (date === logicalToday()) {
    await registerMITActivity({
      userId,
      category: 'family_creative',
      markDone: true,
      note: `Adventure: ${ADVENTURE_META[category].label}`,
    })
  }
}

// ─── Season heat-map — memory artifact, never a streak ─────────────────────
export interface HeatWeek {
  weekStart: string   // Monday (YYYY-MM-DD)
  gotOut: boolean     // any outing that week (faint cell)
  isReal: boolean     // a real adventure that week (full / star cell)
  count: number
}

// One outing the heat-map can light a cell from, normalized to a date + whether
// it's a "real adventure" (the ★). Sourced from real, completed signal — not
// plans — so the season reflects what we actually did.
interface Outing { date: string; isReal: boolean }

// Outdoor, adventure-flavored activity types. Road 'run' is training (lives in
// Trends/Training), so it's intentionally excluded — the heat-map is about
// getting out, not logging miles. Rides include gravel/mtb variants.
function isAdventureActivity(activityType: string): boolean {
  return activityType === 'trail_run'
    || activityType === 'hike'
    || isBikeActivity(activityType)
}

export async function getSeasonHeatmap(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<HeatWeek[]> {
  // Pull every completed signal in the window in parallel, then fold into one
  // list of outings. A hike is always a real adventure (★); a manually-logged
  // adventure is real only if it was starred.
  const [logRes, hikeRes, actRes] = await Promise.all([
    supabase
      .from('adventure_log')
      .select('done_date, is_real')
      .eq('user_id', userId)
      .gte('done_date', startDate)
      .lte('done_date', endDate),
    supabase
      .from('family_hikes')
      .select('date_done')
      .eq('user_id', userId)
      .gte('date_done', startDate)
      .lte('date_done', endDate),
    supabase
      .from('activities')
      .select('activity_date, activity_type')
      .eq('user_id', userId)
      .gte('activity_date', startDate)
      .lte('activity_date', endDate),
  ]) as unknown as [
    { data: { done_date: string; is_real: boolean }[] | null },
    { data: { date_done: string | null }[] | null },
    { data: { activity_date: string; activity_type: string }[] | null },
  ]

  const outings: Outing[] = [
    ...(logRes.data ?? []).map(r => ({ date: r.done_date, isReal: !!r.is_real })),
    ...(hikeRes.data ?? []).filter(h => h.date_done).map(h => ({ date: h.date_done as string, isReal: true })),
    ...(actRes.data ?? [])
      .filter(a => isAdventureActivity(a.activity_type))
      .map(a => ({ date: a.activity_date, isReal: false })),
  ]

  const weeks: HeatWeek[] = []
  let cursor = mondayOf(startDate)
  const lastMonday = mondayOf(endDate)
  while (cursor <= lastMonday) {
    const wkEnd = addDaysStr(cursor, 6)
    const inWk = outings.filter(o => o.date >= cursor && o.date <= wkEnd)
    weeks.push({
      weekStart: cursor,
      gotOut: inWk.length > 0,
      isReal: inWk.some(o => o.isReal),
      count: inWk.length,
    })
    cursor = addDaysStr(cursor, 7)
  }
  return weeks
}
