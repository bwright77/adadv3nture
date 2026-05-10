import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export interface Hike {
  id: string
  book_number: number
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

export function use50Hikes() {
  const { user } = useAuth()
  const [hikes, setHikes] = useState<Hike[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await (supabase as any)
      .from('hikes_50')
      .select('*')
      .eq('user_id', user.id)
      .order('book_number')
    if (data) setHikes(data)
    setIsLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const doneCount = hikes.filter(h => h.done).length
  const suggested = suggestHike(hikes)

  return { hikes, doneCount, suggested, isLoading, refetch: fetch }
}
