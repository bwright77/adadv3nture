import type { TrainingPhase, TrainingWeek } from './training'

// ─── Day-of-week templates per phase ─────────────────────────────────────
// Mirrors the table on the Training tab. Mon→Sun, indexed 0–6 (template
// internal convention; Date#getDay returns 0=Sun, see templateForDow below).
// These describe the SHAPE of a normal week in each phase. The week's
// quality / strength prescriptions on the training_weeks row are the
// per-week details — this table is the recurring scaffold.

export interface DayTemplate {
  day: string         // 'Mon' / 'Tue' / etc.
  primary: string     // headline workout for the day
  sub?: string        // supporting note
}

export const WEEKLY_TEMPLATES: Record<TrainingPhase, DayTemplate[]> = {
  base: [
    { day: 'Mon', primary: 'Run Club PM',                          sub: 'Wash Park · 3–5mi easy · SACRED' },
    { day: 'Tue', primary: 'Strength (TS / RK)',                   sub: '7:40am window' },
    { day: 'Wed', primary: 'Peloton PZ Max · 30–45 min',           sub: 'Primary quality. No impact, no drive.' },
    { day: 'Thu', primary: 'Strides OR cruise miles',              sub: 'Alternate weeks · 4–5mi total + light strength' },
    { day: 'Fri', primary: 'Easy run OR Peloton Row',              sub: '20–30 min · Z1–low Z2' },
    { day: 'Sat', primary: 'Long run (trail)',                     sub: 'Howard / SMR / Denver foothills' },
    { day: 'Sun', primary: 'Easy Z2 bike or row + light strength', sub: 'Active recovery' },
  ],
  build: [
    { day: 'Mon', primary: 'Run Club PM',                          sub: 'Easy effort always' },
    { day: 'Tue', primary: 'Strength (RK Split)',                  sub: 'Lower body or full body' },
    { day: 'Wed', primary: 'Peloton PZ Max',                       sub: 'Primary quality' },
    { day: 'Thu', primary: 'Tempo run OR cruise miles',            sub: 'Alternate weeks · quality #2' },
    { day: 'Fri', primary: 'Easy bike (Z2)',                       sub: 'Cycling volume building' },
    { day: 'Sat', primary: 'Long ride OR long run',                sub: 'Cycling weeks: long ride · Run weeks: long trail' },
    { day: 'Sun', primary: 'Easy alt-mode',                        sub: 'Row, easy bike, or rest — based on Sat load' },
  ],
  peak: [
    { day: 'Mon', primary: 'Run Club PM',                          sub: 'Easy only' },
    { day: 'Tue', primary: 'Maintenance strength',                 sub: '1 set per movement' },
    { day: 'Wed', primary: 'PZ Max OR tempo run',                  sub: 'Last hard quality of the build' },
    { day: 'Thu', primary: 'Easy run',                             sub: 'No quality' },
    { day: 'Fri', primary: 'Rest or 20 min easy row',              sub: 'Race week (W14): rest' },
    { day: 'Sat', primary: 'Bergen sim (W13) / Bergen race (W14)', sub: 'The whole week points here' },
    { day: 'Sun', primary: 'Easy shake-out / recovery',            sub: '20–30 min Z1–Z2' },
  ],
  taper: [
    { day: 'Mon', primary: 'Run Club PM',                          sub: 'Easy' },
    { day: 'Tue', primary: 'Light strength · single set',          sub: '1× per week' },
    { day: 'Wed', primary: 'Strides + easy run (short)',           sub: 'Sharpening, not building' },
    { day: 'Thu', primary: 'Easy run (short)',                     sub: 'Cut duration weekly' },
    { day: 'Fri', primary: 'Rest',                                 sub: 'Sleep is the workout' },
    { day: 'Sat', primary: 'Long run (declining)',                 sub: 'W16: 13 · W17: 10 · W18: 6 · W19: race' },
    { day: 'Sun', primary: 'Easy alt-mode or rest' },
  ],
}

// Date#getDay: 0=Sun, 1=Mon, ..., 6=Sat. Templates are Mon→Sun.
export function templateForDow(phase: TrainingPhase, dow: number): DayTemplate {
  const idx = dow === 0 ? 6 : dow - 1
  return WEEKLY_TEMPLATES[phase][idx]
}

// ─── Week completion against the plan's prescription ─────────────────────
// Inspects the week's activities so the recommendation engine can be
// swap-aware: "long run done Tuesday" should free Saturday's slot.

export interface WeekProgress {
  longRunDone: boolean
  pzMaxDone: boolean
  strengthCount: number
  runMiles: number
  bikeMiles: number
}

interface ActivityLite {
  activity_type: string
  title: string | null
  distance_miles: number | null
  duration_seconds: number | null
}

function isBike(t: string): boolean {
  return t === 'ride' || t.includes('bike') || t.includes('cycl')
}

export function computeWeekProgress(week: TrainingWeek | null, activities: ActivityLite[]): WeekProgress {
  const runs = activities.filter(a => a.activity_type === 'run' || a.activity_type === 'trail_run')
  const bikes = activities.filter(a => isBike(a.activity_type))
  const longRunTarget = week?.target_long_run_miles ?? 0
  const longestRun = runs.length > 0 ? Math.max(...runs.map(r => r.distance_miles ?? 0)) : 0

  // Long run counts as done at 80% of the prescribed distance — accommodates
  // a slightly short run on terrain where descent matters more than mileage.
  const longRunDone = longRunTarget > 0 && longestRun >= longRunTarget * 0.8

  // PZ Max / Climb Ride from Peloton: activity_type='workout', title carries
  // the class name.
  const pzMaxDone = activities.some(a => {
    const t = (a.title ?? '').toLowerCase()
    return t.includes('power zone max') || t.includes('pz max') || t.includes('climb ride')
  })

  const strengthDates = new Set(
    activities
      .filter(a => (a.title ?? '').toLowerCase().includes('strength') && (a.duration_seconds ?? 0) > 600)
      .map(a => a.activity_type),
  )

  return {
    longRunDone,
    pzMaxDone,
    strengthCount: strengthDates.size,
    runMiles: runs.reduce((s, r) => s + (r.distance_miles ?? 0), 0),
    bikeMiles: bikes.reduce((s, r) => s + (r.distance_miles ?? 0), 0),
  }
}

// Classify a template's primary string into a coarse rec kind so the widget
// can pick icons and overrides without string-matching scattered everywhere.
export type RecKind = 'long_run' | 'run_quality' | 'easy_run' | 'pz_max' | 'easy_bike' | 'strength' | 'rest' | 'race' | 'other'

export function classifyPrimary(primary: string): RecKind {
  const p = primary.toLowerCase()
  if (p.includes('long run') || p.includes('long ride') || p.includes('bergen') || p.includes('foco') || p.includes('hurricane') || p.includes('race')) {
    if (p.includes('race')) return 'race'
    if (p.includes('long ride')) return 'easy_bike' // long ride is its own beast, but use bike kind
    return 'long_run'
  }
  if (p.includes('pz max') || p.includes('peloton')) return 'pz_max'
  if (p.includes('strength')) return 'strength'
  if (p.includes('rest')) return 'rest'
  if (p.includes('run club')) return 'easy_run'
  if (p.includes('strides') || p.includes('cruise') || p.includes('tempo') || p.includes('fartlek') || p.includes('progression')) return 'run_quality'
  if (p.includes('easy run')) return 'easy_run'
  if (p.includes('easy bike') || p.includes('row') || p.includes('alt-mode')) return 'easy_bike'
  return 'other'
}
