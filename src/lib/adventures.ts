import { supabase } from './supabase'
import { logicalToday, mondayOf, addDaysStr } from './utils'
import { registerMITActivity } from './daily-plan'
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
// Tiered pools mirror use50Hikes.suggestHike(): prefer the current place + a
// weather-clear + in-season option, then relax constraints one tier at a time.
export interface SuggestContext {
  monthAbbr: string          // 'Jun' — current month, matched against best_months
  placeSlug: string | null   // current resolved location slug
  afternoonWet: boolean      // demote outdoor options when the afternoon's wet
  highF: number | null       // demote water options when it's cool
}

export function suggestAdventure(catalog: Adventure[], ctx: SuggestContext): Adventure | null {
  if (!catalog.length) return null
  const weatherOk = (a: Adventure): boolean => {
    if (ctx.afternoonWet && a.setting === 'outdoor') return false
    if (a.is_water && ctx.highF != null && ctx.highF < 72) return false
    return true
  }
  const inSeason = (a: Adventure): boolean => !a.best_months?.length || a.best_months.includes(ctx.monthAbbr)
  const atPlace = (a: Adventure): boolean => ctx.placeSlug != null && a.place_slug === ctx.placeSlug

  const tiers: ((a: Adventure) => boolean)[] = [
    a => atPlace(a) && weatherOk(a) && inSeason(a),
    a => weatherOk(a) && inSeason(a),
    a => weatherOk(a),
    () => true,
  ]
  for (const pass of tiers) {
    const pool = catalog.filter(pass)
    if (pool.length) return pool[0]
  }
  return catalog[0]
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

export async function getSeasonHeatmap(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<HeatWeek[]> {
  const { data } = await supabase
    .from('adventure_log')
    .select('done_date, is_real')
    .eq('user_id', userId)
    .gte('done_date', startDate)
    .lte('done_date', endDate) as unknown as { data: { done_date: string; is_real: boolean }[] | null }
  const rows = data ?? []

  const weeks: HeatWeek[] = []
  let cursor = mondayOf(startDate)
  const lastMonday = mondayOf(endDate)
  while (cursor <= lastMonday) {
    const wkEnd = addDaysStr(cursor, 6)
    const inWk = rows.filter(r => r.done_date >= cursor && r.done_date <= wkEnd)
    weeks.push({
      weekStart: cursor,
      gotOut: inWk.length > 0,
      isReal: inWk.some(r => r.is_real),
      count: inWk.length,
    })
    cursor = addDaysStr(cursor, 7)
  }
  return weeks
}
