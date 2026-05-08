import { useState, useEffect } from 'react'
import { getSeasonalPhoto } from '../lib/inspiration'
import { useAuth } from '../contexts/AuthContext'

export type TimeOfDay = 'morning' | 'mid-morning' | 'afternoon' | 'evening'

function getTimeOfDay(date: Date): TimeOfDay {
  const mins = date.getHours() * 60 + date.getMinutes()
  if (mins >= 6 * 60 && mins < 9 * 60 + 30) return 'morning'
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

// Picks a fresh seasonal photo each time-of-day period; differs from the widget photo
export function useBgPhoto(tod: TimeOfDay): string {
  const { user } = useAuth()
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    if (!user) return
    getSeasonalPhoto(user.id)
      .then(photo => setUrl(photo?.original_url ?? ''))
      .catch(() => setUrl(''))
  }, [user, tod])

  return url
}
