import { supabase } from './supabase'

export interface RecoveryInputs {
  rhr: number | null
  baseline_rhr: number
  sleep_duration_hours: number | null
  drinks_yesterday: number
  days_since_rest: number
}

export interface RecoveryResult {
  score: number
  tier: 'go_hard' | 'moderate' | 'recovery' | 'unknown'
  confidence: 'high' | 'medium' | 'low'
  inputs: RecoveryInputs
}

function sleepHoursToScore(hours: number): number {
  // 8h = 100, scales down linearly, floor at 0
  return Math.min(100, Math.max(0, (hours / 8) * 100))
}

export function computeRecoveryScore(inputs: RecoveryInputs): RecoveryResult {
  const signals: { score: number; weight: number }[] = []

  if (inputs.rhr !== null) {
    const delta = inputs.rhr - inputs.baseline_rhr
    signals.push({ score: Math.max(0, 100 - (delta / 7) * 100), weight: 0.40 })
  }

  if (inputs.sleep_duration_hours !== null) {
    signals.push({ score: sleepHoursToScore(inputs.sleep_duration_hours), weight: 0.30 })
  }

  const drinkScore = Math.max(0, 100 - (inputs.drinks_yesterday * 25))
  signals.push({ score: drinkScore, weight: 0.20 })

  const restScore = Math.max(0, 100 - (inputs.days_since_rest * 20))
  signals.push({ score: restScore, weight: 0.10 })

  const totalWeight = signals.reduce((s, x) => s + x.weight, 0)
  const score = signals.reduce((s, x) => s + x.score * x.weight, 0) / totalWeight

  const confidence: RecoveryResult['confidence'] =
    signals.length >= 3 ? 'high' : signals.length === 2 ? 'medium' : 'low'

  const tier: RecoveryResult['tier'] =
    score > 80 ? 'go_hard' : score > 60 ? 'moderate' : 'recovery'

  return { score: Math.round(score), tier, confidence, inputs }
}

function toDateStr(d: Date): string {
  return d.toISOString().substring(0, 10)
}

export async function loadRecovery(userId: string): Promise<RecoveryResult> {
  const today = toDateStr(new Date())
  const yesterday = toDateStr(new Date(Date.now() - 86400000))

  // Fetch today's RHR + sleep (from last night), yesterday's drinks
  const { data: signals } = await supabase
    .from('recovery_signals')
    .select('signal_date, rhr, sleep_duration_hours, drinks_consumed')
    .eq('user_id', userId)
    .in('signal_date', [today, yesterday]) as {
      data: { signal_date: string; rhr: number | null; sleep_duration_hours: number | null; drinks_consumed: number }[] | null
    }

  const todayRow = signals?.find(r => r.signal_date === today)
  const yesterdayRow = signals?.find(r => r.signal_date === yesterday)

  // Fetch user baseline RHR
  const { data: userData } = await supabase
    .from('users')
    .select('baseline_rhr')
    .eq('id', userId)
    .single() as { data: { baseline_rhr: number } | null }

  const baseline_rhr = userData?.baseline_rhr ?? 63

  // Count consecutive active days (days_since_rest)
  const lookback = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (i + 1) * 86400000)
    return toDateStr(d)
  })

  const { data: recentActivities } = await supabase
    .from('activities')
    .select('activity_date')
    .eq('user_id', userId)
    .in('activity_date', lookback)
    .order('activity_date', { ascending: false }) as { data: { activity_date: string }[] | null }

  const activeDates = new Set((recentActivities ?? []).map(a => a.activity_date))
  let days_since_rest = 0
  for (const date of lookback) {
    if (activeDates.has(date)) days_since_rest++
    else break
  }

  const inputs: RecoveryInputs = {
    rhr: todayRow?.rhr ?? null,
    baseline_rhr,
    sleep_duration_hours: todayRow?.sleep_duration_hours ?? yesterdayRow?.sleep_duration_hours ?? null,
    drinks_yesterday: yesterdayRow?.drinks_consumed ?? 0,
    days_since_rest,
  }

  return computeRecoveryScore(inputs)
}
