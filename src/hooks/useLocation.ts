import { useEffect, useState } from 'react'
import { DEFAULT_LOCATION, resolveLocation, type ResolvedLocation } from '../lib/locations'

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

export function useLocation(): { location: ResolvedLocation; loading: boolean } {
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
    })
    return () => { cancelled = true }
  }, [])

  return { location, loading }
}
