import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from './useLocation'
import { useWeather } from './useWeather'
import { getAdventures, suggestAdventure, type Adventure, type SuggestContext } from '../lib/adventures'
import { getPlanForDate } from '../lib/daily-plan'
import { logicalToday } from '../lib/utils'

// Powers the Adventure-of-the-Day hero: the catalog, today's context-aware
// suggestion, and whether we've already "got out" today.
export function useAdventures() {
  const { user } = useAuth()
  const { location } = useLocation()
  const { weather } = useWeather()
  const [adventures, setAdventures] = useState<Adventure[]>([])
  const [gotOutToday, setGotOutToday] = useState(false)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!user) return
    const [cat, plan] = await Promise.all([
      getAdventures(user.id),
      getPlanForDate(user.id, logicalToday()),
    ])
    setAdventures(cat)
    setGotOutToday(Boolean(plan?.adventure_done))
    setLoading(false)
  }, [user])

  useEffect(() => { refetch() }, [refetch])

  const monthAbbr = new Date(logicalToday() + 'T12:00:00').toLocaleString('en-US', { month: 'short' })
  const ctx: SuggestContext = {
    monthAbbr,
    placeSlug: location.slug,
    coords: { lat: location.lat, lon: location.lon },
    afternoonWet: weather?.afternoonWet ?? false,
    highF: weather?.highF ?? null,
  }
  const suggested = suggestAdventure(adventures, ctx)

  return { adventures, suggested, gotOutToday, loading, refetch }
}
