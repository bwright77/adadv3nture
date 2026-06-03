// src/lib/strava-streams.ts
//
// Pulls per-second time-series ("streams") for an activity and derives the
// metrics worth querying often. Slots alongside the existing strava.ts sync.
// Table + RLS live in migration 043_activity_streams.sql.

import { supabase } from './supabase'
import { getValidToken } from './strava'

// Karvonen zones — RHR 63 / MHR 191 / HRR 128. Upper edge of Z1..Z5.
// Single-user v1; move to a per-user table when this goes multi-tenant.
const ZONE_UPPER = [139, 152, 165, 178, 191] as const

const STREAM_KEYS = 'time,distance,heartrate,altitude,velocity_smooth,cadence,watts'

interface Stream { data: number[] }
export interface RawStreams {
  time?: Stream
  distance?: Stream
  heartrate?: Stream
  altitude?: Stream
  velocity_smooth?: Stream
  cadence?: Stream
  watts?: Stream
}

export async function fetchStreams(userId: string, stravaId: number): Promise<RawStreams | null> {
  const token = await getValidToken(userId)
  if (!token) return null

  const res = await fetch(
    `https://www.strava.com/api/v3/activities/${stravaId}/streams?keys=${STREAM_KEYS}&key_by_type=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (res.status === 429) throw new Error('STRAVA_RATE_LIMIT')
  if (!res.ok) return null  // streams absent (manual/stationary entry, or no HR recorded)
  return res.json() as Promise<RawStreams>
}

// Seconds in each HR zone, weighted by the actual gap between samples.
export function timeInZone(s: RawStreams): number[] | null {
  const hr = s.heartrate?.data
  const t = s.time?.data
  if (!hr || !t || hr.length !== t.length) return null

  const secs = [0, 0, 0, 0, 0] // Z1..Z5
  for (let i = 1; i < hr.length; i++) {
    const dt = t[i] - t[i - 1]
    let z = ZONE_UPPER.findIndex(upper => hr[i] <= upper)
    if (z < 0) z = 4            // above Z5 ceiling -> Z5
    secs[z] += dt
  }
  return secs.map(Math.round)
}

// Aerobic decoupling: drop in speed-per-beat from first half to second half.
// >5% on a long aerobic effort flags fading durability — useful for WLW prep.
export function decoupling(s: RawStreams): number | null {
  const hr = s.heartrate?.data
  const v = s.velocity_smooth?.data
  if (!hr || !v || hr.length !== v.length || hr.length < 60) return null

  const eff = (a: number, b: number) => {
    let sv = 0, sh = 0, n = 0
    for (let i = a; i < b; i++) if (hr[i] > 0 && v[i] > 0) { sv += v[i]; sh += hr[i]; n++ }
    return n ? (sv / n) / (sh / n) : 0   // speed per beat
  }
  const mid = Math.floor(hr.length / 2)
  const first = eff(0, mid)
  const second = eff(mid, hr.length)
  if (!first || !second) return null
  return Math.round(((first - second) / first) * 1000) / 10  // % drop, 1dp
}

// Fetch + derive + persist for one activity. Idempotent (upsert on activity_id).
export async function enrichWithStreams(userId: string, activityId: string, stravaId: number): Promise<boolean> {
  const streams = await fetchStreams(userId, stravaId)
  if (!streams) return false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from('activity_streams').upsert({
    user_id: userId,
    activity_id: activityId,
    strava_id: stravaId,
    time_s: streams.time?.data ?? null,
    hr_bpm: streams.heartrate?.data ?? null,
    distance_m: streams.distance?.data ?? null,
    altitude_m: streams.altitude?.data ?? null,
    velocity_mps: streams.velocity_smooth?.data ?? null,
    time_in_zone_s: timeInZone(streams),
    decoupling_pct: decoupling(streams),
  }, { onConflict: 'activity_id' })

  if (error) throw new Error(error.message)
  return true
}

// Backfill helper: throttle to stay under Strava's per-athlete limit, resume on 429.
export async function enrichBatch(
  userId: string,
  items: { id: string; strava_id: number }[],
  delayMs = 1500,
): Promise<{ enriched: number; rateLimited: boolean }> {
  let enriched = 0
  for (const a of items) {
    try {
      if (await enrichWithStreams(userId, a.id, a.strava_id)) enriched++
    } catch (e) {
      if (e instanceof Error && e.message === 'STRAVA_RATE_LIMIT') {
        return { enriched, rateLimited: true } // stop; pick up the rest next run
      }
      throw e
    }
    await new Promise(r => setTimeout(r, delayMs))
  }
  return { enriched, rateLimited: false }
}

// Enrich the most-recent activities that don't yet have streams, capped per run
// so a manual sync stays snappy and we catch up over successive syncs without
// tripping Strava's rate limit.
export async function enrichRecentStreams(
  userId: string,
  max = 8,
): Promise<{ enriched: number; rateLimited: boolean }> {
  const { data: acts } = await supabase
    .from('activities')
    .select('id, strava_id, activity_date')
    .eq('user_id', userId)
    .not('strava_id', 'is', null)
    .order('activity_date', { ascending: false })
    .limit(60) as unknown as { data: { id: string; strava_id: number; activity_date: string }[] | null }

  const candidates = acts ?? []
  if (candidates.length === 0) return { enriched: 0, rateLimited: false }

  const { data: have } = await supabase
    .from('activity_streams')
    .select('activity_id')
    .eq('user_id', userId)
    .in('activity_id', candidates.map(a => a.id)) as unknown as { data: { activity_id: string }[] | null }
  const enrichedIds = new Set((have ?? []).map(r => r.activity_id))

  const todo = candidates
    .filter(a => !enrichedIds.has(a.id))
    .slice(0, max)
    .map(a => ({ id: a.id, strava_id: a.strava_id }))

  if (todo.length === 0) return { enriched: 0, rateLimited: false }
  return enrichBatch(userId, todo)
}
