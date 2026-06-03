import { logicalToday } from '../lib/utils'

// Summer Mode runs school-out → school-back. Auto-activates on the date range;
// a Header override can force it on/off (same pattern as the time-of-day override).
export const SUMMER_START = '2026-06-02'
export const SUMMER_END   = '2026-08-26'

export type WeekType = 'solo' | 'camp' | 'weekend'

export function isSummerDate(today: string = logicalToday()): boolean {
  return today >= SUMMER_START && today <= SUMMER_END
}
