// Known places — snap browser geolocation to a friendly name + elevation.
// Adding new locations is the only place to edit; widgets/hooks read from here.

export interface KnownLocation {
  slug: 'denver' | 'howard'
  name: string
  elevationFt: number
  lat: number
  lon: number
  radiusMi: number      // snap to this location if within this radius
}

export const KNOWN_LOCATIONS: KnownLocation[] = [
  { slug: 'denver', name: 'Denver',  elevationFt: 5318,  lat: 39.7392,  lon: -104.9903, radiusMi: 25 },
  { slug: 'howard', name: 'Howard',  elevationFt: 6490,  lat: 38.4339,  lon: -105.8295, radiusMi: 15 },
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
  elevationFt: number | null
  label: string                      // 'Denver · 5,318ft' | 'Current location'
  isKnown: boolean
}

export const DEFAULT_LOCATION: ResolvedLocation = (() => {
  const denver = KNOWN_LOCATIONS[0]
  return {
    lat: denver.lat,
    lon: denver.lon,
    name: denver.name,
    elevationFt: denver.elevationFt,
    label: `${denver.name} · ${denver.elevationFt.toLocaleString()}ft`,
    isKnown: true,
  }
})()

export function resolveLocation(coords: { lat: number; lon: number }): ResolvedLocation {
  const known = matchKnownLocation(coords)
  if (known) {
    return {
      lat: known.lat,
      lon: known.lon,
      name: known.name,
      elevationFt: known.elevationFt,
      label: `${known.name} · ${known.elevationFt.toLocaleString()}ft`,
      isKnown: true,
    }
  }
  return {
    lat: coords.lat,
    lon: coords.lon,
    name: 'Current location',
    elevationFt: null,
    label: 'Current location',
    isKnown: false,
  }
}
