import { useState, useEffect } from 'react'

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

export function getDayType(date: Date): DayType {
  const dow = date.getDay()
  return (dow === 0 || dow === 6) ? 'weekend' : 'weekday'
}

export function getWeekendBlock(date: Date): WeekendBlock {
  const mins = date.getHours() * 60 + date.getMinutes()
  const isSunday = date.getDay() === 0
  if (mins < 9 * 60) return 'weekend-dawn'
  if (mins < 17 * 60) return 'weekend-day'
  return isSunday ? 'weekend-evening-sun' : 'weekend-evening-sat'
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
