import { supabase } from './supabase'

function toDateStr(d: Date): string {
  return d.toISOString().substring(0, 10)
}

function subDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDateStr(d)
}

function avg(nums: (number | null | undefined)[]): number | null {
  const valid = nums.filter((n): n is number => n != null)
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

function sum(nums: (number | null | undefined)[]): number {
  return nums.reduce<number>((a, b) => a + (b ?? 0), 0)
}

export interface TrendRow {
  label: string
  value: string
  delta: string
  direction: 'up' | 'down' | 'flat' | null
  isGood: boolean | null    // null = neutral
  isHero: boolean
  noData: boolean
}

export interface RaceReadiness {
  pct: number
  label: string
  daysUntil: number
  longestRunMiles: number | null
  weeklyMilesAvg: number | null
  nextMilestone: string
}

export interface TrendData {
  rows: TrendRow[]
  readiness: RaceReadiness
  computedAt: string
}

const RACE_DATE = new Date('2026-09-26T12:00:00')
const TRAIN_START = new Date('2026-05-08T12:00:00')
const PEAK_LONG_RUN = 18.6
const STARTING_LONG_RUN = 6.2

function targetLongRunMiles(today: Date): number {
  const peakDate = new Date('2026-09-12T12:00:00')
  const totalMs = peakDate.getTime() - TRAIN_START.getTime()
  const elapsedMs = Math.max(0, today.getTime() - TRAIN_START.getTime())
  const progress = Math.min(1, elapsedMs / totalMs)
  return STARTING_LONG_RUN + (PEAK_LONG_RUN - STARTING_LONG_RUN) * progress
}

function formatDelta(delta: number | null, unit = '', decimals = 1): string {
  if (delta == null) return '—'
  const abs = Math.abs(delta).toFixed(decimals)
  if (Math.abs(delta) < 0.05) return '→ same'
  return delta > 0 ? `↑ ${abs}${unit}` : `↓ ${abs}${unit}`
}

function direction(delta: number | null): 'up' | 'down' | 'flat' | null {
  if (delta == null) return null
  if (Math.abs(delta) < 0.05) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

export async function getTrends(userId: string): Promise<TrendData> {
  const today = new Date()
  const d7 = subDays(7)
  const d14 = subDays(14)
  const d30 = subDays(30)
  const d90 = subDays(90)

  const [metricsRes, activitiesRes, recoveryRes] = await Promise.all([
    supabase
      .from('body_metrics')
      .select('measured_at, weight_lbs, body_fat_pct, muscle_mass_pct')
      .eq('user_id', userId)
      .gte('measured_at', d90)
      .order('measured_at', { ascending: false }),

    supabase
      .from('activities')
      .select('activity_date, activity_type, distance_miles, duration_seconds, avg_hr')
      .eq('user_id', userId)
      .gte('activity_date', d90)
      .order('activity_date', { ascending: false }),

    supabase
      .from('recovery_signals')
      .select('signal_date, rhr, drinks_consumed, sleep_duration_hours, recovery_score')
      .eq('user_id', userId)
      .gte('signal_date', d14)
      .order('signal_date', { ascending: false }),
  ])

  const metrics = (metricsRes.data ?? []) as {
    measured_at: string
    weight_lbs: number | null
    body_fat_pct: number | null
    muscle_mass_pct: number | null
  }[]

  const activities = (activitiesRes.data ?? []) as {
    activity_date: string
    activity_type: string
    distance_miles: number | null
    duration_seconds: number | null
    avg_hr: number | null
  }[]

  const recovery = (recoveryRes.data ?? []) as {
    signal_date: string
    rhr: number | null
    drinks_consumed: number
    sleep_duration_hours: number | null
    recovery_score: number | null
  }[]

  // ── Weight ──────────────────────────────────────────────────
  const metricsThisWeek = metrics.filter(m => m.measured_at >= d7)
  const metricsLastWeek = metrics.filter(m => m.measured_at >= d14 && m.measured_at < d7)
  const wCurr = avg(metricsThisWeek.map(m => m.weight_lbs))
  const wPrev = avg(metricsLastWeek.map(m => m.weight_lbs))
  // Fall back to most recent single reading
  const wLatest = wCurr ?? metrics[0]?.weight_lbs ?? null
  const wDelta = wCurr != null && wPrev != null ? wCurr - wPrev : null

  // ── Body fat ─────────────────────────────────────────────────
  const bfCurr = avg(metricsThisWeek.map(m => m.body_fat_pct))
  const bfPrev = avg(metricsLastWeek.map(m => m.body_fat_pct))
  const bfLatest = bfCurr ?? metrics.find(m => m.body_fat_pct != null)?.body_fat_pct ?? null
  const bfDelta = bfCurr != null && bfPrev != null ? bfCurr - bfPrev : null

  // ── Run miles ────────────────────────────────────────────────
  const runs = activities.filter(a => a.activity_type === 'run' || a.activity_type === 'trail_run')
  const runsThisWeek = runs.filter(r => r.activity_date >= d7)
  const runsLastWeek = runs.filter(r => r.activity_date >= d14 && r.activity_date < d7)
  const milesCurr = sum(runsThisWeek.map(r => r.distance_miles))
  const milesPrev = sum(runsLastWeek.map(r => r.distance_miles))
  const milesDelta = activities.length > 0 ? milesCurr - milesPrev : null

  // ── Workouts/week ────────────────────────────────────────────
  const wkCurr = activities.filter(a => a.activity_date >= d7).length
  const wkPrev = activities.filter(a => a.activity_date >= d14 && a.activity_date < d7).length
  const wkDelta = activities.length > 0 ? wkCurr - wkPrev : null

  // ── RHR ──────────────────────────────────────────────────────
  const rhrThisWeek = recovery.filter(r => r.signal_date >= d7)
  const rhrLastWeek = recovery.filter(r => r.signal_date >= d14 && r.signal_date < d7)
  const rhrCurr = avg(rhrThisWeek.map(r => r.rhr))
  const rhrPrev = avg(rhrLastWeek.map(r => r.rhr))
  const rhrDelta = rhrCurr != null && rhrPrev != null ? rhrCurr - rhrPrev : null

  // ── Drinks/day ───────────────────────────────────────────────
  const dkThisWeek = recovery.filter(r => r.signal_date >= d7)
  const dkLastWeek = recovery.filter(r => r.signal_date >= d14 && r.signal_date < d7)
  const dkCurr = avg(dkThisWeek.map(r => r.drinks_consumed))
  const dkPrev = avg(dkLastWeek.map(r => r.drinks_consumed))
  const dkDelta = dkCurr != null && dkPrev != null ? dkCurr - dkPrev : null

  // ── Race readiness ────────────────────────────────────────────
  const daysUntil = Math.ceil((RACE_DATE.getTime() - today.getTime()) / 86400000)
  const runs30d = activities.filter(a =>
    (a.activity_type === 'run' || a.activity_type === 'trail_run') && a.activity_date >= d30
  )
  const longestRun = runs30d.length > 0
    ? Math.max(...runs30d.map(r => r.distance_miles ?? 0))
    : null

  const weeklyMilesArr: number[] = []
  for (let w = 0; w < 4; w++) {
    const wStart = subDays((w + 1) * 7)
    const wEnd = subDays(w * 7)
    const wMiles = sum(
      runs.filter(r => r.activity_date >= wStart && r.activity_date < wEnd).map(r => r.distance_miles)
    )
    if (wMiles > 0) weeklyMilesArr.push(wMiles)
  }
  const weeklyMilesAvg = weeklyMilesArr.length > 0
    ? weeklyMilesArr.reduce((a, b) => a + b, 0) / weeklyMilesArr.length
    : null

  const targetLR = targetLongRunMiles(today)
  const avgRecovery = avg(recovery.map(r => r.recovery_score)) ?? 70
  const volScore = weeklyMilesAvg != null ? Math.min(100, (weeklyMilesAvg / 20) * 100) : 50
  const lrScore = longestRun != null ? Math.min(100, (longestRun / targetLR) * 100) : 50
  const consScore = Math.min(100, (wkCurr / 5) * 100)
  const recScore = Math.min(100, avgRecovery)
  const readinessPct = Math.round(volScore * 0.3 + lrScore * 0.3 + consScore * 0.25 + recScore * 0.15)

  const readinessLabel =
    readinessPct >= 80 ? 'ON TRACK · BUILD BLOCK' :
    readinessPct >= 60 ? 'BUILDING · STAY CONSISTENT' :
    readinessPct >= 40 ? 'EARLY BUILD · TRUST PROCESS' :
    'DAY 1 · FOUNDATION'

  const weeksUntil = Math.floor(daysUntil / 7)
  const nextMilestone =
    weeksUntil > 16 ? `need ${Math.ceil(targetLR * 1.2)}mi long run by July 1` :
    weeksUntil > 8 ? `peak week target: 18mi long run` :
    `taper begins in ${weeksUntil - 2} weeks`

  // ── Build report card rows ────────────────────────────────────
  const rows: TrendRow[] = [
    {
      label: 'Weight',
      value: wLatest != null ? `${wLatest.toFixed(1)} lbs` : '—',
      delta: wDelta != null ? formatDelta(wDelta, ' lbs') : wLatest ? `target ${(wLatest - 178).toFixed(1)} lbs to goal` : 'no data yet',
      direction: direction(wDelta),
      isGood: wDelta != null ? wDelta < 0 : null,
      isHero: false,
      noData: wLatest == null,
    },
    {
      label: 'Body fat %',
      value: bfLatest != null ? `${bfLatest.toFixed(1)}%` : '—',
      delta: bfDelta != null ? formatDelta(bfDelta, '%') : bfLatest ? 'no prior week' : 'scale arrives 5/10',
      direction: direction(bfDelta),
      isGood: bfDelta != null ? bfDelta < 0 : null,
      isHero: false,
      noData: bfLatest == null,
    },
    {
      label: 'Miles run',
      value: milesCurr > 0 ? `${milesCurr.toFixed(1)} /wk` : '—',
      delta: milesDelta != null ? formatDelta(milesDelta, ' mi') : activities.length > 0 ? 'no prior week' : 'no data yet',
      direction: direction(milesDelta),
      isGood: milesDelta != null ? milesDelta >= 0 : null,
      isHero: false,
      noData: milesCurr === 0 && activities.length === 0,
    },
    {
      label: 'Workouts',
      value: wkCurr > 0 ? `${wkCurr} /wk` : '—',
      delta: wkDelta != null ? formatDelta(wkDelta, '', 0) : activities.length > 0 ? 'no prior week' : 'no data yet',
      direction: direction(wkDelta),
      isGood: wkDelta != null ? wkDelta >= 0 : null,
      isHero: false,
      noData: wkCurr === 0 && activities.length === 0,
    },
    {
      label: 'RHR',
      value: rhrCurr != null ? `${Math.round(rhrCurr)} bpm` : '—',
      delta: rhrDelta != null ? formatDelta(rhrDelta, ' bpm') : rhrCurr ? 'no prior week' : 'no Apple Health yet',
      direction: direction(rhrDelta),
      isGood: rhrDelta != null ? rhrDelta < 0 : null,
      isHero: false,
      noData: rhrCurr == null,
    },
    {
      label: 'Drinks/day',
      value: dkCurr != null ? `${dkCurr.toFixed(1)}/d` : '—',
      delta: dkDelta != null ? formatDelta(dkDelta, '/d') : dkCurr != null ? 'no prior week' : 'no data yet',
      direction: direction(dkDelta),
      isGood: dkDelta != null ? dkDelta <= 0 : dkCurr != null ? dkCurr <= 2 : null,
      isHero: false,
      noData: dkCurr == null,
    },
  ]

  return {
    rows,
    readiness: {
      pct: readinessPct,
      label: readinessLabel,
      daysUntil,
      longestRunMiles: longestRun,
      weeklyMilesAvg,
      nextMilestone,
    },
    computedAt: new Date().toISOString(),
  }
}
