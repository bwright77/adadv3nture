import { logicalToday } from '../lib/utils'

// Summer Mode runs school-out → school-back. Auto-activates on the date range;
// a Header override can force it on/off (same pattern as the time-of-day override).
export const SUMMER_START = '2026-06-02'
export const SUMMER_END   = '2026-08-26'

export type WeekType = 'solo' | 'camp' | 'weekend'

export function isSummerDate(today: string = logicalToday()): boolean {
  return today >= SUMMER_START && today <= SUMMER_END
}

// The only weeks the kids are away at camp this summer — daytime is his. Every
// other summer weekday is 'solo' (kids with Ben). Keep in sync with the matching
// list in supabase/functions/morning-briefing/index.ts.
export const CAMP_WEEKS: { start: string; end: string }[] = [
  { start: '2026-06-08', end: '2026-06-12' },  // day camp
  { start: '2026-07-06', end: '2026-07-10' },  // YMCA camp
]

export function isCampWeek(today: string = logicalToday()): boolean {
  return CAMP_WEEKS.some(w => today >= w.start && today <= w.end)
}
