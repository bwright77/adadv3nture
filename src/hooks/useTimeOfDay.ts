import { useState, useEffect } from 'react'
import { getSeasonalPhoto } from '../lib/inspiration'
import { useAuth } from '../contexts/AuthContext'

export type TimeOfDay = 'morning' | 'mid-morning' | 'afternoon' | 'evening'

export const TOD_BLOCKS: Record<TimeOfDay, { label: string; sub: string; time: string }> = {
  'morning':     { label: 'MORNING',     sub: 'DENVER · BOOT CAMP',              time: '7:35–9:30'  },
  'mid-morning': { label: 'MID-MORNING', sub: 'WA BLOCK · QUIET HOURS',          time: '9:30–2:30'  },
  'afternoon':   { label: 'AFTERNOON',   sub: '4PM HOUR · KIDS HOME SOON',        time: '2:30–6PM'   },
  'evening':     { label: 'EVENING',     sub: 'LOG · TOMORROW · EVENING IS YOURS',  time: '6PM+'       },
}

export const MORNING_START_MINS = 6 * 60

function getTimeOfDay(date: Date): TimeOfDay {
  const mins = date.getHours() * 60 + date.getMinutes()
  if (mins >= MORNING_START_MINS && mins < 9 * 60 + 30) return 'morning'
  if (mins >= 9 * 60 + 30 && mins < 14 * 60 + 30) return 'mid-morning'
  if (mins >= 14 * 60 + 30 && mins < 18 * 60) return 'afternoon'
  return 'evening'
}

export function useTimeOfDay(): TimeOfDay {
  const [tod, setTod] = useState<TimeOfDay>(() => getTimeOfDay(new Date()))

  useEffect(() => {
    const tick = () => setTod(getTimeOfDay(new Date()))
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }

    const id = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
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
