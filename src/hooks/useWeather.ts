import { useState, useEffect } from 'react'
import { getLocationAndWeather, type WeatherData } from '../lib/openweather'

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getLocationAndWeather()
      .then(w => { setWeather(w); setError(false) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return { weather, loading, error }
}
