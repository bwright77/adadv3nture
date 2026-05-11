// Single source of truth for "days until X" math + copy.
//
// Why this exists: countdowns were scattered across ~10 widgets with three
// subtle bugs each — UTC midnight vs local-noon parsing (Denver users saw
// counts a day high), no "today" or "passed" copy, no plural handling
// ("1 DAYS"), and `Math.floor(negative/7)` rendering "-1wk" the day after.

const MS_PER_DAY = 86_400_000

// Anchor to local noon so DST boundaries and timezones don't shift the count.
function asLocalNoon(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00')
}

export function daysUntil(dateStr: string): number {
  const target = asLocalNoon(dateStr)
  const now = new Date()
  // Today-at-noon vs. target-at-noon — gives clean integer day deltas.
  const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  return Math.round((target.getTime() - todayNoon.getTime()) / MS_PER_DAY)
}

// Weeks portion of a days remainder. Returns null when days is negative,
// since "negative weeks" is not a useful display.
export function weeksFromDays(days: number): number | null {
  if (days < 0) return null
  return Math.floor(days / 7)
}

// Single-line copy for headline countdowns. Handles 0/1/past explicitly.
export function formatCountdown(days: number): string {
  if (days < 0) return 'passed'
  if (days === 0) return 'today'
  if (days === 1) return '1 day'
  return `${days} days`
}

// Compact chip variant for LockStrip / hero tiles. Always upper-cased; the
// caller controls colour.
export function formatCountdownChip(days: number): string {
  if (days < 0) return 'PAST'
  if (days === 0) return 'TODAY'
  return `${days}D`
}

// "{weeks}wk · {days}d" but graceful when passed.
export function formatWeeksDays(days: number): string {
  if (days < 0) return 'passed'
  if (days === 0) return 'today'
  const w = Math.floor(days / 7)
  const d = days % 7
  if (w === 0) return `${d}d`
  return `${w}wk · ${d}d`
}
