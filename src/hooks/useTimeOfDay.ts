import { useState, useEffect } from 'react'

export type TimeOfDay = 'morning' | 'mid-morning' | 'afternoon' | 'evening'

function getTimeOfDay(date: Date): TimeOfDay {
  const mins = date.getHours() * 60 + date.getMinutes()
  if (mins >= 7 * 60 + 35 && mins < 9 * 60 + 30) return 'morning'
  if (mins >= 9 * 60 + 30 && mins < 14 * 60 + 30) return 'mid-morning'
  if (mins >= 14 * 60 + 30 && mins < 18 * 60) return 'afternoon'
  return 'evening'
}

export function useTimeOfDay(): TimeOfDay {
  const [tod, setTod] = useState<TimeOfDay>(() => getTimeOfDay(new Date()))

  useEffect(() => {
    const tick = () => setTod(getTimeOfDay(new Date()))
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  return tod
}

export const BG_PHOTOS: Record<TimeOfDay, string> = {
  'morning':     '/photos/fj62-pass.jpg',
  'mid-morning': '/photos/river-canyon.jpg',
  'afternoon':   '/photos/camp-tacos.jpg',
  'evening':     '/photos/tent-stars.jpg',
}
