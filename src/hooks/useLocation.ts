import { useEffect, useState } from 'react'
import { DEFAULT_LOCATION, resolveLocation, type ResolvedLocation } from '../lib/locations'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface Cache {
  location: ResolvedLocation
  fetchedAt: number
}

let cache: Cache | null = null
const TTL_MS = 5 * 60 * 1000     // re-detect at most every 5 min

function detect(): Promise<ResolvedLocation> {
  return new Promise(resolve => {
    if (!navigator.geolocation) {
      resolve(DEFAULT_LOCATION)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve(resolveLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude })),
      () => resolve(DEFAULT_LOCATION),
      { timeout: 5000, maximumAge: 5 * 60 * 1000 },
    )
  })
}

// Fire-and-forget: persist the resolved location so server-side flows
// (apple-health-webhook → morning-briefing) can read where the user is.
function persist(userId: string, loc: ResolvedLocation): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  db.from('users').update({
    last_known_location: {
      lat: loc.lat,
      lon: loc.lon,
      name: loc.name,
      elevation_ft: loc.elevationFt,
      resolved_at: new Date().toISOString(),
    },
  }).eq('id', userId).then(() => { /* swallow */ }).catch(() => { /* swallow */ })
}

export function useLocation(): { location: ResolvedLocation; loading: boolean } {
  const { user } = useAuth()
  const [location, setLocation] = useState<ResolvedLocation>(
    () => cache?.location ?? DEFAULT_LOCATION,
  )
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
      setLocation(cache.location)
      setLoading(false)
      return
    }
    let cancelled = false
    detect().then(loc => {
      if (cancelled) return
      cache = { location: loc, fetchedAt: Date.now() }
      setLocation(loc)
      setLoading(false)
      if (user) persist(user.id, loc)
    })
    return () => { cancelled = true }
  }, [user])

  return { location, loading }
}
