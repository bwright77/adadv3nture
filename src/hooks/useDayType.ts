import { useState, useEffect } from 'react'
import { MORNING_START_MINS } from './useTimeOfDay'

export type DayType = 'weekday' | 'weekend'
export type WeekendBlock = 'weekend-dawn' | 'weekend-day' | 'weekend-evening-sat' | 'weekend-evening-sun'

export const WEEKEND_BLOCKS: Record<WeekendBlock, { label: string; sub: string; time: string }> = {
  'weekend-dawn':        { label: 'DAWN',    sub: 'SLOW START · COFFEE · KIDS',        time: '6–9AM'  },
  'weekend-day':         { label: 'THE DAY', sub: 'THE MOVE · BIG EFFORT',             time: '9AM–5PM' },
  'weekend-evening-sat': { label: 'EVENING', sub: 'DINNER · LOG · WIND DOWN',          time: '5PM+'   },
  'weekend-evening-sun': { label: 'SUNDAY',  sub: 'PREP · WEEK AHEAD · RUN CLUB TMR', time: '5PM+'   },
}

export const WEEKEND_BLOCK_ORDER: WeekendBlock[] = [
  'weekend-dawn', 'weekend-day', 'weekend-evening-sat', 'weekend-evening-sun',
]

// 3-item picker: Sat/Sun evening distinction is internal routing, not a user choice
export const WEEKEND_PICKER_ORDER: WeekendBlock[] = [
  'weekend-dawn', 'weekend-day', 'weekend-evening-sat',
]

export function getDayType(date: Date): DayType {
  const dow = date.getDay()
  return (dow === 0 || dow === 6) ? 'weekend' : 'weekday'
}

export function getWeekendBlock(date: Date): WeekendBlock {
  const mins = date.getHours() * 60 + date.getMinutes()
  const dow = date.getDay() // 0=Sun, 6=Sat
  // Before morning threshold on Sunday = still Saturday evening
  if (dow === 0 && mins < MORNING_START_MINS) return 'weekend-evening-sat'
  if (mins < 9 * 60) return 'weekend-dawn'
  if (mins < 17 * 60) return 'weekend-day'
  return dow === 0 ? 'weekend-evening-sun' : 'weekend-evening-sat'
}

export function useDayType(): { dayType: DayType; weekendBlock: WeekendBlock } {
  const [dayType, setDayType] = useState<DayType>(() => getDayType(new Date()))
  const [weekendBlock, setWeekendBlock] = useState<WeekendBlock>(() => getWeekendBlock(new Date()))

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setDayType(getDayType(now))
      setWeekendBlock(getWeekendBlock(now))
    }
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }

    const id = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return { dayType, weekendBlock }
}
