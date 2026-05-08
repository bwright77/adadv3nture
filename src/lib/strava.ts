import { supabase } from './supabase'

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID as string
const REDIRECT_URI = import.meta.env.VITE_STRAVA_REDIRECT_URI as string

export function getStravaAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'activity:read_all',
    approval_prompt: 'auto',
    state: userId,
  })
  return `https://www.strava.com/oauth/authorize?${params}`
}

async function getValidToken(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('oauth_tokens')
    .select('access_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'strava')
    .maybeSingle() as unknown as { data: { access_token: string; expires_at: string } | null }

  if (!data) return null

  // Refresh if expired or expiring within 5 minutes
  if (new Date(data.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
    const res = await fetch('/api/strava/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) return null
    const refreshed = await res.json() as { access_token: string }
    return refreshed.access_token
  }

  return data.access_token
}

function metersToMiles(m: number): number {
  return Math.round((m / 1609.34) * 100) / 100
}

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084)
}

function mpsToSecondsPerMile(mps: number): number {
  return mps > 0 ? Math.round(1609.34 / mps) : 0
}

function stravaTypeToLocal(type: string): string {
  const map: Record<string, string> = {
    Run: 'run', TrailRun: 'run',
    Ride: 'ride', VirtualRide: 'ride', GravelRide: 'ride',
    WeightTraining: 'strength', Workout: 'workout',
    Hike: 'hike', Walk: 'walk',
    Swim: 'swim', Yoga: 'yoga',
  }
  return map[type] ?? type.toLowerCase()
}

export interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  start_date: string
  elapsed_time: number
  distance: number
  total_elevation_gain: number
  average_heartrate?: number
  max_heartrate?: number
  average_speed: number
  average_watts?: number
  kilojoules?: number
  calories?: number
  suffer_score?: number
}

export async function syncActivities(userId: string, daysBack = 90): Promise<number> {
  const token = await getValidToken(userId)
  if (!token) throw new Error('No valid Strava token')

  const after = Math.floor((Date.now() - daysBack * 86400 * 1000) / 1000)
  const activities: StravaActivity[] = []
  let page = 1

  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) break
    const batch = await res.json() as StravaActivity[]
    if (!batch.length) break
    activities.push(...batch)
    if (batch.length < 100) break
    page++
  }

  if (!activities.length) return 0

  // Fetch existing strava_ids so we only insert new ones
  const { data: existing } = await supabase
    .from('activities')
    .select('strava_id')
    .eq('user_id', userId)
    .not('strava_id', 'is', null) as { data: { strava_id: number }[] | null }

  const existingIds = new Set((existing ?? []).map(r => r.strava_id))
  const newActivities = activities.filter(a => !existingIds.has(a.id))

  if (!newActivities.length) return 0

  const rows = newActivities.map(a => ({
    user_id: userId,
    source: 'strava',
    strava_id: a.id,
    activity_type: stravaTypeToLocal(a.sport_type ?? a.type),
    title: a.name,
    activity_date: a.start_date.substring(0, 10),
    start_time: a.start_date,
    duration_seconds: a.elapsed_time,
    distance_miles: a.distance ? metersToMiles(a.distance) : null,
    elevation_feet: a.total_elevation_gain ? metersToFeet(a.total_elevation_gain) : null,
    avg_hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    max_hr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
    avg_pace_seconds_per_mile: a.average_speed ? mpsToSecondsPerMile(a.average_speed) : null,
    avg_watts: a.average_watts ? Math.round(a.average_watts) : null,
    total_output_kj: a.kilojoules ?? null,
    calories: a.calories ? Math.round(a.calories) : null,
  }))

  // Insert in batches of 100
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from('activities').insert(rows.slice(i, i + 100))
    if (error) throw new Error(error.message)
  }

  return newActivities.length
}

export async function getRecentActivities(userId: string, limit = 7) {
  const { data } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function isStravaConnected(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('oauth_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', 'strava')
    .maybeSingle()
  return !!data
}
