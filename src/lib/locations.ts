// Known places — snap browser geolocation to a friendly name + elevation.
// Adding new locations is the only place to edit; widgets/hooks read from here.

// Childcare-relief gradient — how much daytime help a place affords. Drives the
// summer adventure suggester + briefing ("daytime's free, bank a WA session").
// 'free' is the camp week-type, which has no geography — it's supplied by week-type,
// not by snapping to a location.
export type Relief = 'grandparents' | 'in_laws' | 'home' | 'free'

export const RELIEF_LABEL: Record<Relief, string> = {
  grandparents: 'grandparents nearby',
  in_laws: 'in-laws nearby',
  home: 'home base',
  free: 'daytime free',
}

export interface KnownLocation {
  slug: 'denver' | 'howard' | 'greeley' | 'evans'
  name: string
  elevationFt: number
  lat: number
  lon: number
  radiusMi: number      // snap to this location if within this radius
  relief: Relief
}

export const KNOWN_LOCATIONS: KnownLocation[] = [
  { slug: 'denver',  name: 'Denver',  elevationFt: 5318, lat: 39.7392, lon: -104.9903, radiusMi: 25, relief: 'home' },
  { slug: 'howard',  name: 'Howard',  elevationFt: 6490, lat: 38.4339, lon: -105.8295, radiusMi: 15, relief: 'grandparents' },
  { slug: 'greeley', name: 'Greeley', elevationFt: 4658, lat: 40.4233, lon: -104.7091, radiusMi: 12, relief: 'in_laws' },
  { slug: 'evans',   name: 'Evans',   elevationFt: 4715, lat: 40.3766, lon: -104.6919, radiusMi: 8,  relief: 'in_laws' },
]

export function haversineMi(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 3958.8
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(x))
}

// The two houses, split out of the Home category. Each maps to a known
// location so the Home list can default to wherever you physically are.
export type HomeSite = 'birch' | 'yellow_house'

export const HOME_SITES: { id: HomeSite; label: string; place: string; slug: KnownLocation['slug'] }[] = [
  { id: 'birch',        label: 'Birch St',     place: 'Denver', slug: 'denver' },
  { id: 'yellow_house', label: 'Yellow House', place: 'Howard', slug: 'howard' },
]

// Which house am I at? Howard → Yellow House; everything else → Birch (primary).
export function siteForSlug(slug: string | null): HomeSite {
  return slug === 'howard' ? 'yellow_house' : 'birch'
}

export function homeSiteLabel(site: HomeSite): string {
  return site === 'yellow_house' ? 'Yellow House' : 'Birch St'
}

export function matchKnownLocation(coords: { lat: number; lon: number }): KnownLocation | null {
  for (const loc of KNOWN_LOCATIONS) {
    if (haversineMi(coords, loc) <= loc.radiusMi) return loc
  }
  return null
}

export interface ResolvedLocation {
  lat: number
  lon: number
  name: string                       // 'Denver' | 'Howard' | 'Current location'
  slug: KnownLocation['slug'] | null
  elevationFt: number | null
  label: string                      // 'Denver · 5,318ft' | 'Current location'
  isKnown: boolean
  relief: Relief | null              // null when unknown; camp 'free' comes from week-type
}

export const DEFAULT_LOCATION: ResolvedLocation = (() => {
  const denver = KNOWN_LOCATIONS[0]
  return {
    lat: denver.lat,
    lon: denver.lon,
    name: denver.name,
    slug: denver.slug,
    elevationFt: denver.elevationFt,
    label: `${denver.name} · ${denver.elevationFt.toLocaleString()}ft`,
    isKnown: true,
    relief: denver.relief,
  }
})()

export function resolvedFromKnown(loc: KnownLocation): ResolvedLocation {
  return {
    lat: loc.lat,
    lon: loc.lon,
    name: loc.name,
    slug: loc.slug,
    elevationFt: loc.elevationFt,
    label: `${loc.name} · ${loc.elevationFt.toLocaleString()}ft`,
    isKnown: true,
    relief: loc.relief,
  }
}

export function resolvedFromSlug(slug: KnownLocation['slug']): ResolvedLocation | null {
  const loc = KNOWN_LOCATIONS.find(l => l.slug === slug)
  return loc ? resolvedFromKnown(loc) : null
}

export function resolveLocation(coords: { lat: number; lon: number }): ResolvedLocation {
  const known = matchKnownLocation(coords)
  if (known) {
    return {
      lat: known.lat,
      lon: known.lon,
      name: known.name,
      slug: known.slug,
      elevationFt: known.elevationFt,
      label: `${known.name} · ${known.elevationFt.toLocaleString()}ft`,
      isKnown: true,
      relief: known.relief,
    }
  }
  return {
    lat: coords.lat,
    lon: coords.lon,
    name: 'Current location',
    slug: null,
    elevationFt: null,
    label: 'Current location',
    isKnown: false,
    relief: null,
  }
}
