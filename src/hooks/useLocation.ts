import { useEffect, useState } from 'react'
import {
  DEFAULT_LOCATION, resolveLocation, resolvedFromSlug,
  type ResolvedLocation, type KnownLocation,
} from '../lib/locations'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface Cache {
  location: ResolvedLocation
  fetchedAt: number
}

let cache: Cache | null = null
const TTL_MS = 5 * 60 * 1000     // re-detect at most every 5 min
const OVERRIDE_KEY = 'adadv-location-override'
const LOC_EVENT = 'adadv-location-change'

type Slug = KnownLocation['slug']

function readOverride(): ResolvedLocation | null {
  try {
    const slug = localStorage.getItem(OVERRIDE_KEY) as Slug | null
    return slug ? resolvedFromSlug(slug) : null
  } catch { return null }
}

// Manual location override — survives across devices/sessions in localStorage.
// On desktop (no GPS) this is how you say "I'm in Howard." Pass null to clear.
export function setLocationOverride(slug: Slug | null): void {
  try {
    if (slug) localStorage.setItem(OVERRIDE_KEY, slug)
    else localStorage.removeItem(OVERRIDE_KEY)
  } catch { /* ignore */ }
  cache = null
  window.dispatchEvent(new Event(LOC_EVENT))
}

export function getLocationOverride(): Slug | null {
  try { return localStorage.getItem(OVERRIDE_KEY) as Slug | null } catch { return null }
}

function geolocate(): Promise<ResolvedLocation | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve(resolveLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude })),
      () => resolve(null),                       // denied / unavailable (common on desktop)
      { timeout: 5000, maximumAge: 5 * 60 * 1000 },
    )
  })
}

// Desktop fallback: the last place any device (usually the phone) resolved to,
// persisted on the users row — so the desktop "follows" the phone to Howard.
async function fetchLastKnown(userId: string): Promise<ResolvedLocation | null> {
  const { data } = await supabase
    .from('users').select('last_known_location').eq('id', userId).maybeSingle()
  const lk = (data as { last_known_location?: { lat?: number; lon?: number } | null } | null)?.last_known_location
  if (lk && typeof lk.lat === 'number' && typeof lk.lon === 'number') {
    return resolveLocation({ lat: lk.lat, lon: lk.lon })
  }
  return null
}

function persist(userId: string, loc: ResolvedLocation): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  db.from('users').update({
    last_known_location: {
      lat: loc.lat, lon: loc.lon, name: loc.name,
      elevation_ft: loc.elevationFt, resolved_at: new Date().toISOString(),
    },
  }).eq('id', userId).then(() => { /* swallow */ }).catch(() => { /* swallow */ })
}

export function useLocation(): { location: ResolvedLocation; loading: boolean } {
  const { user } = useAuth()
  const [location, setLocation] = useState<ResolvedLocation>(
    () => readOverride() ?? cache?.location ?? DEFAULT_LOCATION,
  )
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      // 1) Manual override always wins.
      const override = readOverride()
      if (override) {
        cache = { location: override, fetchedAt: Date.now() }
        if (!cancelled) { setLocation(override); setLoading(false) }
        return
      }
      // 2) Fresh cache.
      if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
        if (!cancelled) { setLocation(cache.location); setLoading(false) }
        return
      }
      // 3) GPS → last-known (desktop) → Denver default.
      const gps = await geolocate()
      let resolved = gps
      if (!resolved && user) resolved = await fetchLastKnown(user.id)
      if (!resolved) resolved = DEFAULT_LOCATION
      cache = { location: resolved, fetchedAt: Date.now() }
      if (!cancelled) { setLocation(resolved); setLoading(false) }
      if (gps && user) persist(user.id, gps)   // only persist real GPS fixes
    }

    resolve()
    const onChange = () => resolve()
    window.addEventListener(LOC_EVENT, onChange)
    return () => { cancelled = true; window.removeEventListener(LOC_EVENT, onChange) }
  }, [user])

  return { location, loading }
}
