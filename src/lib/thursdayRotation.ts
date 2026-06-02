// Thursday outdoor-quality rotation — develops race-pace neuromuscular
// patterns and lactate clearance that Z2 volume alone doesn't build.
//
// Four-week rotation that cycles continuously, independent of week numbering.
// The pointer advances on COMPLETION, not calendar position: we derive it from
// the count of completed Thursday quality sessions in Strava (per the "derive
// from activities" decision), so a skipped Thursday simply doesn't advance it.
//
// Phase overrides downgrade or skip the prescribed type — see thursdayPrescription.

import type { TrainingPhase } from './training'
import type { WeekCharacterKind } from './weekCharacter'

export type RotationKey = 'cruise' | 'strides' | 'tempo' | 'intervals'

export interface RotationType {
  key: RotationKey
  label: string
  detail: string                 // dose / structure
  pelotonInstructors: string[]   // empty → self-directed
  pelotonClass: string | null    // Peloton Outdoor class type, null if self-directed
}

// Rotation order matches the handoff: cruise → strides → tempo → race-pace.
export const THURSDAY_ROTATION: RotationType[] = [
  {
    key: 'cruise',
    label: 'Cruise miles',
    detail: 'Z2 endurance · 30–45 min',
    pelotonInstructors: ['Becs Gentry', 'Matt Wilpers', 'Andy Speer'],
    pelotonClass: 'Outdoor Endurance Run',
  },
  {
    key: 'strides',
    label: 'Strides',
    detail: '4–5mi easy + 6–8 × 20s strides',
    pelotonInstructors: [],
    pelotonClass: null,
  },
  {
    key: 'tempo',
    label: 'Tempo',
    detail: 'Z3 continuous · 30–45 min',
    pelotonInstructors: ['Becs Gentry', 'Matt Wilpers'],
    pelotonClass: 'Outdoor Tempo Run',
  },
  {
    key: 'intervals',
    label: 'Race-pace intervals',
    detail: 'race-pace reps · 30–45 min',
    pelotonInstructors: ['Becs Gentry', 'Marcel Dinkins', 'Matt Wilpers'],
    pelotonClass: 'Outdoor Intervals Run',
  },
]

// Avoid these Peloton class families — they don't fit structured pace work.
export const PELOTON_SYNC_WARNING =
  "Peloton Outdoor classes don't auto-sync to Strava — record simultaneously with Apple Watch."

export const FLAT_ROUTES = [
  'Wash Park loop (2.6 mi)',
  'City Park loop (1.65 mi)',
  'Cherry Creek Trail (continuous)',
]

interface ActivityLite {
  activity_type: string
  activity_date: string   // YYYY-MM-DD
}

function isRun(t: string): boolean {
  return t === 'run' || t === 'trail_run'
}

// Thursday in Denver-local terms: anchor the date at noon so the weekday
// doesn't shift across the UTC boundary.
function isThursday(dateStr: string): boolean {
  return new Date(dateStr + 'T12:00:00').getDay() === 4
}

// Rotation index (0–3) = completed Thursday quality sessions since plan start,
// mod 4. Distinct dates so a double-session Thursday only advances once; a
// skipped Thursday (no run logged) leaves the pointer where it was.
export function deriveRotationIndex(activities: ActivityLite[], planStart: string): number {
  const thursdays = new Set(
    activities
      .filter(a => isRun(a.activity_type) && a.activity_date >= planStart && isThursday(a.activity_date))
      .map(a => a.activity_date),
  )
  return thursdays.size % THURSDAY_ROTATION.length
}

export function rotationAt(index: number): RotationType {
  return THURSDAY_ROTATION[((index % THURSDAY_ROTATION.length) + THURSDAY_ROTATION.length) % THURSDAY_ROTATION.length]
}

export interface ThursdayPrescription {
  skip: boolean
  type: RotationType | null   // null when skipped
  note: string                // why skipped, or the downgrade reason / sub-note
}

// Apply phase + week-character overrides to the rotation pointer's prescription:
// - Race week    → skip quality (easy shake-out only)
// - Recovery week → easy cruise only, never tempo/intervals
// - TAPER        → cruise/strides only (downgrade tempo/intervals → cruise)
// - PEAK         → no intervals (downgrade intervals → tempo)
// - BASE/BUILD   → full rotation
export function thursdayPrescription(opts: {
  phase: TrainingPhase | null
  characterKind: WeekCharacterKind
  rotationIndex: number
}): ThursdayPrescription {
  const { phase, characterKind, rotationIndex } = opts
  const base = rotationAt(rotationIndex)

  if (characterKind === 'race') {
    return { skip: true, type: null, note: 'Race week — easy 3–4mi shake-out only, no quality.' }
  }
  if (characterKind === 'recovery') {
    return { skip: false, type: rotationAt(0), note: 'Recovery week — easy cruise only, hold the rotation.' }
  }
  if (phase === 'taper' && (base.key === 'tempo' || base.key === 'intervals')) {
    return { skip: false, type: rotationAt(0), note: 'Taper — cruise/strides only, no hard quality.' }
  }
  if (phase === 'peak' && base.key === 'intervals') {
    return { skip: false, type: rotationAt(2), note: 'Peak — tempo, no intervals (preserve the legs).' }
  }
  return { skip: false, type: base, note: '' }
}
