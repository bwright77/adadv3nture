import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from './useLocation'
import { registerMITActivity } from '../lib/daily-plan'
import { logicalToday } from '../lib/utils'
import { haversineMi } from '../lib/locations'

export interface Hike {
  id: string
  book_number: number | null      // null for family-added (custom) hikes
  is_custom: boolean
  name: string
  region: string | null
  hub: string | null
  distance_mi: number | null
  difficulty: 'easy' | 'moderate' | 'challenging' | null
  elevation_gain_ft: number | null
  highlights: string | null
  drive_minutes_denver: number | null
  best_months: string[] | null
  alltrails_url: string | null
  trailhead_lat: number | null
  trailhead_lng: number | null
  done: boolean
  date_done: string | null
  family_rating: number | null
  notes: string | null
  strava_activity_id: number | null
}

// Fields for adding a family hike that isn't in the original 50.
export interface NewHike {
  name: string
  hub?: string | null
  distance_mi?: number | null
  drive_minutes_denver?: number | null
  best_months?: string[] | null
  // Optional immediate completion (logging one we already did).
  done?: boolean
  date_done?: string | null
  family_rating?: number | null
  notes?: string | null
}

// A day-trip-from-here radius. Geo-sensitive: a hike is only suggested if its
// trailhead is reachable from where you actually are — so a Front Range hike
// isn't offered while you're in Howard. (drive_minutes_denver is Denver-relative
// and useless when away from Denver, so it's no longer the gate.)
const MAX_HIKE_MILES = 90

function suggestHike(hikes: Hike[], coords: { lat: number; lon: number } | null): Hike | null {
  const undone = hikes.filter(h => !h.done)
  if (undone.length === 0) return null

  const month = new Date(logicalToday() + 'T12:00:00').toLocaleString('en-US', { month: 'short' })
  const hasCoords = (h: Hike): boolean => h.trailhead_lat != null && h.trailhead_lng != null
  const distOf = (h: Hike): number | null =>
    coords && hasCoords(h)
      ? haversineMi(coords, { lat: h.trailhead_lat as number, lon: h.trailhead_lng as number })
      : null
  // Reachable today? An unplaced custom hike (no trailhead coords) travels with
  // you; a located hike must be within range; unknown location → don't filter.
  const nearby = (h: Hike): boolean => {
    if (!hasCoords(h)) return true
    if (!coords) return true
    return (distOf(h) as number) <= MAX_HIKE_MILES
  }
  const seasonal = (h: Hike): boolean => h.best_months?.some(m => m.startsWith(month)) ?? false
  // Closest first when we can measure; unplaced sink to the end.
  const byDistance = (a: Hike, b: Hike): number => {
    const da = distOf(a), db = distOf(b)
    if (da == null && db == null) return 0
    if (da == null) return 1
    if (db == null) return -1
    return da - db
  }

  const reachable = undone.filter(nearby)
  // Prefer in-season + reachable, then any reachable. No far-away fallback —
  // nothing nearby ⇒ null (the hero degrades to its first-undone tap target).
  const tiers = [reachable.filter(seasonal), reachable]
  for (const pool of tiers) {
    if (pool.length > 0) return [...pool].sort(byDistance)[0]
  }
  return null
}

export function useFamilyHikes() {
  const { user } = useAuth()
  const { location } = useLocation()
  const [hikes, setHikes] = useState<Hike[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await (supabase as any)
      .from('family_hikes')
      .select('*')
      .eq('user_id', user.id)
      .order('book_number')
    if (data) setHikes(data)
    setIsLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  async function addHike(fields: NewHike): Promise<void> {
    if (!user) return
    const isDone = fields.done ?? false
    await (supabase as any).from('family_hikes').insert({
      user_id: user.id,
      name: fields.name,
      is_custom: true,
      book_number: null,
      hub: fields.hub ?? null,
      distance_mi: fields.distance_mi ?? null,
      drive_minutes_denver: fields.drive_minutes_denver ?? null,
      best_months: fields.best_months ?? null,
      done: isDone,
      date_done: isDone ? (fields.date_done ?? logicalToday()) : null,
      family_rating: fields.family_rating ?? null,
      notes: fields.notes ?? null,
    })
    if (isDone) {
      await registerMITActivity({
        userId: user.id,
        category: 'family_creative',
        markDone: true,
        note: `Hike: ${fields.name}`,
      })
    }
    await fetch()
  }

  // Family Hikes is an open, aspirational collection — hikes we've done
  // together, growing over time. No fixed goal to "complete" (no book-50).
  const doneCount = hikes.filter(h => h.done).length
  const suggested = suggestHike(hikes, { lat: location.lat, lon: location.lon })

  return { hikes, doneCount, suggested, isLoading, refetch: fetch, addHike }
}
