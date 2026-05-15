import { supabase } from './supabase'

const WITHINGS_CLIENT_ID = import.meta.env.VITE_WITHINGS_CLIENT_ID as string
const REDIRECT_URI = import.meta.env.VITE_WITHINGS_REDIRECT_URI as string

export function getWithingsAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: WITHINGS_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'user.metrics',
    state: userId,
  })
  return `https://account.withings.com/oauth2_user/authorize2?${params}`
}

export class WithingsAuthError extends Error {
  constructor(message = 'Withings session expired — please reconnect.') {
    super(message)
    this.name = 'WithingsAuthError'
  }
}

async function getValidToken(userId: string): Promise<string> {
  const { data } = await supabase
    .from('oauth_tokens')
    .select('access_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'withings')
    .maybeSingle() as unknown as { data: { access_token: string; expires_at: string } | null }

  if (!data) throw new WithingsAuthError('Withings not connected.')

  if (new Date(data.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
    const res = await fetch('/api/withings/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) {
      // Refresh-token chain is dead (Withings rotates on every refresh and
      // expires after a year). Clear the row so the UI flips to "Connect".
      if (res.status === 401 || res.status === 400 || res.status === 404) {
        await disconnectWithings(userId).catch(() => null)
      }
      throw new WithingsAuthError()
    }
    const refreshed = await res.json() as { access_token: string }
    return refreshed.access_token
  }

  return data.access_token
}

export async function disconnectWithings(userId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db.from('oauth_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'withings')
}

interface WithingsMeasure {
  value: number
  type: number
  unit: number
}

interface WithingsMeasureGroup {
  grpid: number
  date: number
  measures: WithingsMeasure[]
}

function withingsValue(measures: WithingsMeasure[], type: number): number | null {
  const m = measures.find(x => x.type === type)
  if (!m) return null
  return m.value * Math.pow(10, m.unit)
}

function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10
}

export interface BodyMetricRow {
  user_id: string
  measured_at: string
  source: 'withings'
  weight_lbs: number | null
  body_fat_pct: number | null
  muscle_mass_lbs: number | null
  muscle_mass_pct: number | null
  bone_mass_lbs: number | null
  water_pct: number | null
  withings_id: number
}

export async function syncBodyMetrics(userId: string, daysBack = 90): Promise<number> {
  const token = await getValidToken(userId)

  const startdate = Math.floor((Date.now() - daysBack * 86400 * 1000) / 1000)

  const body = new URLSearchParams({
    action: 'getmeas',
    meastype: '1,5,6,8,76,77,88',
    category: '1',
    startdate: String(startdate),
  })

  const res = await fetch('https://wbsapi.withings.net/measure', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!res.ok) throw new Error('Withings API error')

  const json = await res.json() as { status: number; body: { measuregrps: WithingsMeasureGroup[] } }
  if (json.status === 401 || json.status === 100 || json.status === 101) {
    await disconnectWithings(userId).catch(() => null)
    throw new WithingsAuthError()
  }
  if (json.status !== 0) throw new Error(`Withings error: ${json.status}`)

  const groups = json.body?.measuregrps ?? []
  if (!groups.length) return 0

  const { data: existing } = await supabase
    .from('body_metrics')
    .select('withings_id')
    .eq('user_id', userId)
    .not('withings_id', 'is', null) as { data: { withings_id: number }[] | null }

  const existingIds = new Set((existing ?? []).map(r => r.withings_id))
  const newGroups = groups.filter(g => !existingIds.has(g.grpid))
  if (!newGroups.length) return 0

  const rows: BodyMetricRow[] = newGroups.map(g => {
    const weightKg = withingsValue(g.measures, 1)
    const muscleKg = withingsValue(g.measures, 76)
    const boneKg = withingsValue(g.measures, 88)
    return {
      user_id: userId,
      measured_at: new Date(g.date * 1000).toISOString(),
      source: 'withings',
      weight_lbs: weightKg !== null ? kgToLbs(weightKg) : null,
      body_fat_pct: withingsValue(g.measures, 6),
      muscle_mass_lbs: muscleKg !== null ? kgToLbs(muscleKg) : null,
      muscle_mass_pct: muscleKg !== null && weightKg ? Math.round((muscleKg / weightKg) * 1000) / 10 : null,
      bone_mass_lbs: boneKg !== null ? kgToLbs(boneKg) : null,
      water_pct: withingsValue(g.measures, 77),
      withings_id: g.grpid,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from('body_metrics').insert(rows.slice(i, i + 100))
    if (error) throw new Error(error.message)
  }

  return newGroups.length
}

export async function getRecentBodyMetrics(userId: string, limit = 30) {
  const { data } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function isWithingsConnected(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('oauth_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', 'withings')
    .maybeSingle()
  return !!data
}
