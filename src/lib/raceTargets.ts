// Race-pace target reference data for the WLW prep season.
//
// These are the pace / finish targets for the season's races, surfaced on the
// EventDetail screen and used as the reference for Thursday quality work. WLW
// sustained pace (11:00–11:30/mi) is the primary training reference for tempo
// and interval prescriptions.
//
// Lives in src/lib (not src/data) to match where the rest of the app keeps
// static reference constants.

export interface RacePaces {
  blended: string
  [segment: string]: string
}

export interface RaceTarget {
  key: string
  date: string                 // YYYY-MM-DD, matches the training_goals row
  distance: number             // miles
  elevationGain: number        // ft
  location?: string
  url?: string
  courseMapUrl?: string
  targetFinish: string
  paces: RacePaces
  role: 'tune_up' | 'A_race'
  // Plain-English segment labels paired with the `paces` keys, in race order,
  // so the UI can render a readable pace breakdown without hard-coding keys.
  segments: { key: string; label: string }[]
  notes?: string
}

export const RACE_TARGETS: Record<string, RaceTarget> = {
  fibarkTrailRun10K: {
    key: 'fibarkTrailRun10K',
    date: '2026-06-21',
    distance: 6.2,
    elevationGain: 750,
    location: 'Arkansas Hills Trail System, Salida CO',
    url: 'https://www.athlinks.com/event/fibark-10k-trail-run-355370',
    courseMapUrl: 'https://s3.amazonaws.com/bazu-static/event-course-map/85608/course-map-3997.pdf',
    targetFinish: '56–58 min',
    role: 'tune_up',
    paces: {
      openingClimb: '10:30–11:00',   // mile 0–1, 350 ft gain
      rollingMid: '9:00–9:30',       // mile 1–3.5
      secondClimb: '10:00–10:30',    // mile 3.5–4.5 to high point
      descentFinish: '7:30–8:30',    // mile 4.5–6.2, 700 ft drop
      blended: '9:00–9:30',
    },
    segments: [
      { key: 'openingClimb', label: 'Opening climb (mi 0–1)' },
      { key: 'rollingMid', label: 'Rolling middle (mi 1–3.5)' },
      { key: 'secondClimb', label: 'Second climb (mi 3.5–4.5)' },
      { key: 'descentFinish', label: 'Descent finish (mi 4.5–6.2)' },
      { key: 'blended', label: 'Blended' },
    ],
    notes: 'Tune-up race / fitness benchmark. Triple Crown Competition final. Familiar course (run before, MTB regularly), behind Tenderfoot Mountain. Mixed dirt roads and singletrack. Profile: hard opening climb to mile 1, rolling middle, second climb to high point at mile 4.5, fast descent finish.',
  },
  bergenPeakHM: {
    key: 'bergenPeakHM',
    date: '2026-08-22',
    distance: 13.1,
    elevationGain: 2451,
    targetFinish: '2:34–2:44',
    role: 'A_race',
    paces: {
      climbs: '13:00–14:00',
      flatRolling: '10:00–11:00',
      descents: '9:30–10:30',
      blended: '11:45–12:30',
    },
    segments: [
      { key: 'climbs', label: 'Climbs' },
      { key: 'flatRolling', label: 'Flat / rolling' },
      { key: 'descents', label: 'Descents' },
      { key: 'blended', label: 'Blended' },
    ],
    notes: 'Summit 9,708 ft. The single best WLW predictor — run controlled, read the data.',
  },
  westLineWinder30K: {
    key: 'westLineWinder30K',
    date: '2026-09-26',
    distance: 18.1,
    elevationGain: 2450,
    targetFinish: '3:24–3:45',
    role: 'A_race',
    paces: {
      climbs: '12:30–13:30',
      flatRolling: '10:30–11:30',
      descents: '10:00–11:00',
      sustained: '11:00–11:30',   // primary training reference pace
      blended: '11:15–11:45',
    },
    segments: [
      { key: 'climbs', label: 'Climbs' },
      { key: 'flatRolling', label: 'Flat / rolling' },
      { key: 'descents', label: 'Descents' },
      { key: 'sustained', label: 'Sustained (training ref)' },
      { key: 'blended', label: 'Blended' },
    ],
    notes: 'High point 8,530 ft. Sustained pace (11:00–11:30/mi) is the primary training reference for tempo and interval work.',
  },
}

// Match a training_goals row to its race-pace target. Date is the most robust
// key (event dates are stable, names get edited), with a name-keyword fallback.
export function matchRaceTarget(goal: { event_date: string; event_name: string }): RaceTarget | null {
  const byDate = Object.values(RACE_TARGETS).find(t => t.date === goal.event_date)
  if (byDate) return byDate
  const name = goal.event_name.toLowerCase()
  if (name.includes('fibark')) return RACE_TARGETS.fibarkTrailRun10K
  if (name.includes('bergen')) return RACE_TARGETS.bergenPeakHM
  if (name.includes('west line') || name.includes('winder')) return RACE_TARGETS.westLineWinder30K
  return null
}
