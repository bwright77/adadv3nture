// Week character taxonomy — the meaningful in-the-moment label for a plan week.
//
// Week numbers (W1, W7…) are arbitrary planning artifacts. Phase + character
// (Build / Recovery / Race / Taper) is what actually drives a training
// decision, so this is the primary label the UI leads with. Week numbers
// stay available as secondary metadata (URLs, the full plan view, analytics).
//
// Character is computed, not stored: it derives from phase_id, the key_marker
// down-week flag, and whether a race falls in (or just before) the week. That
// keeps it in sync with the live training_goals without a migration.

import type { TrainingWeek, TrainingGoal, TrainingPhase } from './training'

export type WeekCharacterKind = 'build' | 'recovery' | 'race' | 'taper'

export interface WeekCharacter {
  kind: WeekCharacterKind
  // Full primary label, e.g. "BASE · Build week" / "BUILD · FIBArk race week".
  label: string
  // The character phrase alone, e.g. "Build week" / "FIBArk recovery".
  phrase: string
  raceName?: string          // short race name when a race is in this week
}

const PHASE_LABEL: Record<TrainingPhase, string> = {
  base: 'BASE', build: 'BUILD', peak: 'PEAK', taper: 'TAPER',
}

// Distinctive short name for a race so labels read "FIBArk race week" rather
// than the full event title. Falls back to the first word.
export function raceShortName(eventName: string): string {
  const n = eventName.toLowerCase()
  if (n.includes('fibark')) return 'FIBArk'
  if (n.includes('foco')) return 'FOCO'
  if (n.includes('hurricane')) return 'Hurricane'
  if (n.includes('bergen')) return 'Bergen'
  if (n.includes('west line') || n.includes('winder')) return 'WLW'
  return eventName.split(/\s+/)[0]
}

// Sunday (inclusive) of the week starting on `weekStart` (a Monday).
function weekEnd(weekStart: string): string {
  const d = new Date(weekStart + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().substring(0, 10)
}

function shiftDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().substring(0, 10)
}

function isDownWeek(week: TrainingWeek): boolean {
  const marker = (week.key_marker ?? '').toLowerCase()
  return marker.startsWith('🔽') || marker.includes('down') || marker.includes('recovery')
}

// Find an active race whose date falls within [from, to] (inclusive).
function raceInRange(goals: TrainingGoal[], from: string, to: string): TrainingGoal | null {
  return goals.find(g => g.status === 'active' && g.event_date >= from && g.event_date <= to) ?? null
}

export function weekCharacter(week: TrainingWeek, goals: TrainingGoal[]): WeekCharacter {
  const phase = week.phase_id
  const phasePrefix = phase ? PHASE_LABEL[phase] : (week.phase_label || '').toUpperCase()
  const start = week.week_start
  const end = weekEnd(start)

  const compose = (kind: WeekCharacterKind, phrase: string, raceName?: string): WeekCharacter => ({
    kind,
    phrase,
    raceName,
    label: phasePrefix ? `${phasePrefix} · ${phrase}` : phrase,
  })

  // 1. A race in this week is the strongest signal — the week reshapes around it.
  const raceThisWeek = raceInRange(goals, start, end)
  if (raceThisWeek) {
    return compose('race', `${raceShortName(raceThisWeek.event_name)} race week`, raceShortName(raceThisWeek.event_name))
  }

  // 2. The week right after a race is recovery, named for the race it follows.
  const raceLastWeek = raceInRange(goals, shiftDays(start, -7), shiftDays(start, -1))
  if (raceLastWeek) {
    return compose('recovery', `${raceShortName(raceLastWeek.event_name)} recovery`, raceShortName(raceLastWeek.event_name))
  }

  // 3. Explicit down-week marker → recovery.
  if (isDownWeek(week)) {
    return compose('recovery', 'Recovery week')
  }

  // 4. Taper phase (no race, not a down week) → taper character.
  if (phase === 'taper') {
    return compose('taper', 'Taper week')
  }

  // 5. Default: a standard load-increasing week.
  return compose('build', 'Build week')
}
