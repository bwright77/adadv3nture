import { useState, useEffect } from 'react'
import { getSeasonalPhoto } from '../lib/inspiration'

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

const bgCache: Partial<Record<string, string>> = {}

export function useBgPhoto(tod: TimeOfDay, userId?: string): string {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    if (!userId) return
    const key = `${userId}:${tod}`
    if (bgCache[key]) { setUrl(bgCache[key]!); return }
    getSeasonalPhoto(userId)
      .then(photo => {
        const picked = photo?.original_url ?? ''
        bgCache[key] = picked
        setUrl(picked)
      })
      .catch(() => setUrl(''))
  }, [tod, userId])

  return url
}
