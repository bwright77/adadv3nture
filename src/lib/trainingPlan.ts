// Smart trainer — derive this week's targets from upcoming training_goals.
//
// Algorithm (per event):
//   1. Parse distance from the event's `distance_label`.
//   2. Build phase = the 12 weeks ending 2 weeks before the event.
//   3. Long workout target ramps linearly from `BASE_PCT` × distance
//      at build_start to full distance at peak.
//   4. After peak, taper for 2 weeks: linear de-ramp from 100% to ~50%
//      of distance. Race week = ~25% of distance.
//   5. Total weekly miles = `TOTAL_MULTIPLIER` × long workout.
//   6. Phase label per event: off / base / build / peak / taper / race.
//
// Combining events of the SAME discipline: take MAX of long and MAX of
// total. (Most demanding prep wins; doubling up doesn't make sense.)
// Different disciplines are independent — run and cycling don't compete.
//
// Strength comes from program-tracker (existing prescription), not the
// event derivation.

import type { TrainingGoal, TrainingWeek } from './training'
import type { ProgramState } from './program-tracker'
import { weeklyStrengthSessions } from './program-tracker'

const BASE_PCT = 0.30                // starting long-workout = 30% of event distance
const BUILD_WEEKS = 12               // length of the build ramp
const TAPER_WEEKS = 2                // weeks of taper before race
const TOTAL_MULTIPLIER = 1.5         // weekly total = 1.5× long workout
const RACE_WEEK_PCT = 0.25           // long workout in the race week itself
const TAPER_END_PCT = 0.5            // long workout at end of taper (right before race week)

type Phase = 'off' | 'base' | 'build' | 'peak' | 'taper' | 'race'
const PHASE_ORDER: Phase[] = ['off', 'base', 'build', 'taper', 'peak', 'race']

interface Contribution {
  long: number
  total: number
  phase: Phase
}

// Pulls the leading numeric value out of strings like "62.6 mi", "40mi",
// "100 km", "75-100 miles". Returns null if nothing parseable.
export function parseDistanceMiles(label: string | null | undefined): number | null {
  if (!label) return null
  const m = label.match(/(\d+(?:\.\d+)?)\s*(km|kilometers?|mi|miles?)?/i)
  if (!m) return null
  const n = parseFloat(m[1])
  if (!isFinite(n) || n <= 0) return null
  const unit = (m[2] ?? '').toLowerCase()
  if (unit.startsWith('km') || unit.startsWith('kilo')) return n * 0.621371
  return n
}

function weeksBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (7 * 86_400_000)
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000)
}

function contributionFor(eventDate: Date, distance: number, today: Date): Contribution {
  const weeksToEvent = weeksBetween(today, eventDate)
  if (weeksToEvent < -0.5) {
    return { long: 0, total: 0, phase: 'off' }
  }

  const peakDate = addDays(eventDate, -7 * TAPER_WEEKS)        // 2 weeks before event
  const buildStart = addDays(peakDate, -7 * BUILD_WEEKS)       // 12 weeks before peak
  const baseLong = distance * BASE_PCT
  const taperEndLong = distance * TAPER_END_PCT

  let long: number
  let phase: Phase

  if (weeksToEvent <= 1) {
    // Race week — minimal volume
    long = distance * RACE_WEEK_PCT
    phase = 'race'
  } else if (weeksToEvent <= TAPER_WEEKS) {
    // Taper: linear de-ramp from peak to taper-end over TAPER_WEEKS
    const taperProgress = (TAPER_WEEKS - weeksToEvent) / TAPER_WEEKS  // 0 at peak end → 1 at race
    long = distance - (distance - taperEndLong) * taperProgress
    phase = 'taper'
  } else if (weeksToEvent <= TAPER_WEEKS + 1) {
    // Peak week (the week just before taper starts)
    long = distance
    phase = 'peak'
  } else if (today < buildStart) {
    // Build hasn't started yet — hold at base
    long = baseLong
    phase = 'base'
  } else {
    // Build phase — ramp from base to peak
    const buildElapsed = weeksBetween(buildStart, today)
    const progress = Math.min(1, Math.max(0, buildElapsed / BUILD_WEEKS))
    long = baseLong + (distance - baseLong) * progress
    phase = 'build'
  }

  return {
    long: Math.round(long * 10) / 10,
    total: Math.round(long * TOTAL_MULTIPLIER * 10) / 10,
    phase,
  }
}

function pickHigherPhase(a: Phase, b: Phase): Phase {
  return PHASE_ORDER.indexOf(a) >= PHASE_ORDER.indexOf(b) ? a : b
}

function combineContributions(parts: Contribution[]): Contribution {
  if (parts.length === 0) return { long: 0, total: 0, phase: 'off' }
  return parts.reduce((acc, c) => ({
    long: Math.max(acc.long, c.long),
    total: Math.max(acc.total, c.total),
    phase: pickHigherPhase(acc.phase, c.phase),
  }), { long: 0, total: 0, phase: 'off' as Phase })
}

function isRunDiscipline(t: TrainingGoal['event_type']): boolean {
  return t === 'trail_run'
}

function isCyclingDiscipline(t: TrainingGoal['event_type']): boolean {
  return t === 'cycling_road' || t === 'cycling_gravel'
}

// Returns this week's Monday as YYYY-MM-DD in local time.
function thisMonday(today: Date): string {
  const d = new Date(today)
  d.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const PHASE_LABEL: Record<Phase, string> = {
  off: 'Off-season',
  base: 'Base',
  build: 'Build',
  peak: 'Peak',
  taper: 'Taper',
  race: 'Race week',
}

// Composes a TrainingWeek-shaped object so existing consumers (WeekCard,
// WTomorrow) don't need to change. ID is synthetic — this row never hits
// the DB unless promoted to a manual override.
export function deriveTrainingWeek(
  userId: string,
  events: TrainingGoal[],
  program: ProgramState | null,
  today: Date = new Date(),
): TrainingWeek {
  const runParts: Contribution[] = []
  const cyclingParts: Contribution[] = []

  for (const ev of events) {
    if (ev.status === 'skipped' || ev.status === 'complete') continue
    const distance = parseDistanceMiles(ev.distance_label)
    if (distance == null) continue
    const evDate = new Date(ev.event_date + 'T12:00:00')
    const c = contributionFor(evDate, distance, today)
    if (c.long <= 0) continue
    if (isRunDiscipline(ev.event_type)) runParts.push(c)
    else if (isCyclingDiscipline(ev.event_type)) cyclingParts.push(c)
  }

  const run = combineContributions(runParts)
  const ride = combineContributions(cyclingParts)
  const phase = pickHigherPhase(run.phase, ride.phase)
  const strength = weeklyStrengthSessions(program)

  return {
    id: `derived-${thisMonday(today)}`,
    user_id: userId,
    week_start: thisMonday(today),
    phase_label: PHASE_LABEL[phase],
    target_run_miles: run.long > 0 ? run.total : null,
    target_long_run_miles: run.long > 0 ? run.long : null,
    target_cycling_miles: ride.total > 0 ? ride.total : null,
    target_strength_sessions: strength,
    actual_run_miles: null,
    actual_cycling_miles: null,
    actual_strength_sessions: null,
    notes: null,
  }
}

export function isDerivedWeek(w: TrainingWeek | null): boolean {
  return !!w && typeof w.id === 'string' && w.id.startsWith('derived-')
}
