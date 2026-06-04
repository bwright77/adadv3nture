import { useState, useEffect } from 'react'
import { getWeather, type WeatherData } from '../lib/openweather'
import { useLocation } from './useLocation'

// Weather now follows the app's resolved location (GPS → last-known → override)
// instead of self-geolocating, so the forecast is correct on desktop too.
export function useWeather() {
  const { location, loading: locLoading } = useLocation()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (locLoading) return
    let cancelled = false
    getWeather(location)
      .then(w => { if (!cancelled) { setWeather(w); setError(false) } })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [location.lat, location.lon, locLoading])

  return { weather, loading, error }
}
