import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { registerMITActivity } from '../lib/daily-plan'
import { logicalToday } from '../lib/utils'

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

function suggestHike(hikes: Hike[]): Hike | null {
  const undone = hikes.filter(h => !h.done)
  if (undone.length === 0) return null

  const month = new Date().toLocaleString('en-US', { month: 'short' })

  // Priority: seasonal + day-trip → seasonal only → day-trip only → any
  const seasonal = undone.filter(h => h.best_months?.some(m => m.startsWith(month)))
  const dayTrip = undone.filter(h => (h.drive_minutes_denver ?? 999) <= 90)

  const candidates = [
    seasonal.filter(h => (h.drive_minutes_denver ?? 999) <= 90),
    seasonal,
    dayTrip,
    undone,
  ]

  for (const pool of candidates) {
    if (pool.length > 0) return pool[0] // already sorted by book_number
  }

  return null
}

export function useFamilyHikes() {
  const { user } = useAuth()
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

  const doneCount = hikes.filter(h => h.done).length
  // Book progress (of the original 50) drives the goal ring; custom hikes are
  // bonus, never pushing the ring past 100%.
  const bookDoneCount = hikes.filter(h => h.done && !h.is_custom).length
  const suggested = suggestHike(hikes)

  return { hikes, doneCount, bookDoneCount, suggested, isLoading, refetch: fetch, addHike }
}
