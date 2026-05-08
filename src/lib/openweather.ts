const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string
const DENVER = { lat: 39.7392, lon: -104.9903, label: 'Denver · 5,318ft' }

export interface WeatherData {
  label: string
  tempF: number
  highF: number
  lowF: number
  condition: string        // 'Clear' | 'Clouds' | 'Rain' | 'Snow' | 'Thunderstorm' | etc.
  description: string      // 'light rain', 'overcast clouds', etc.
  windMph: number
  isRaining: boolean
  isSnowing: boolean
  // Workout routing
  runOk: boolean           // temp < 80°F
  bikeOk: boolean          // temp < 90°F, no rain/snow
  // 4pm window (3pm–6pm forecast)
  afternoonWet: boolean
  afternoonTempF: number | null
}

interface OWMCurrent {
  main: { temp: number; temp_min: number; temp_max: number }
  weather: { main: string; description: string }[]
  wind: { speed: number }
  name: string
}

interface OWMForecastItem {
  dt: number
  main: { temp: number }
  weather: { main: string }[]
  pop: number              // probability of precipitation 0–1
}

interface OWMForecast {
  list: OWMForecastItem[]
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OpenWeatherMap ${res.status}`)
  return res.json() as Promise<T>
}

export async function getWeather(coords?: { lat: number; lon: number; label: string }): Promise<WeatherData> {
  const loc = coords ?? DENVER

  const base = `https://api.openweathermap.org/data/2.5`
  const params = `lat=${loc.lat}&lon=${loc.lon}&appid=${API_KEY}&units=imperial`

  const [current, forecast] = await Promise.all([
    fetchJSON<OWMCurrent>(`${base}/weather?${params}`),
    fetchJSON<OWMForecast>(`${base}/forecast?${params}&cnt=16`),
  ])

  const condition = current.weather[0]?.main ?? 'Clear'
  const description = current.weather[0]?.description ?? ''
  const tempF = Math.round(current.main.temp)
  const windMph = Math.round((current.wind.speed ?? 0) * 1)  // already mph in imperial
  const isRaining = ['Rain', 'Drizzle', 'Thunderstorm'].includes(condition)
  const isSnowing = condition === 'Snow'

  // Today's high/low from forecast (next 24h slots)
  const todaySlots = forecast.list.slice(0, 8)
  const temps = todaySlots.map(s => s.main.temp)
  const forecastHigh = Math.round(Math.max(current.main.temp_max, ...temps))
  const forecastLow = Math.round(Math.min(current.main.temp_min, ...temps))

  // Afternoon window: slots roughly 3pm–6pm local
  const now = new Date()
  const afternoonSlots = forecast.list.filter(s => {
    const slotHour = new Date(s.dt * 1000).getHours()
    return slotHour >= 14 && slotHour <= 18
  })
  const afternoonWet = afternoonSlots.some(
    s => s.pop > 0.3 || ['Rain', 'Drizzle', 'Thunderstorm', 'Snow'].includes(s.weather[0]?.main ?? '')
  )
  const afternoonTempF = afternoonSlots.length > 0
    ? Math.round(afternoonSlots.reduce((s, x) => s + x.main.temp, 0) / afternoonSlots.length)
    : null

  return {
    label: loc.label,
    tempF,
    highF: forecastHigh,
    lowF: forecastLow,
    condition,
    description,
    windMph,
    isRaining,
    isSnowing,
    runOk: tempF < 80,
    bikeOk: tempF < 90 && !isRaining && !isSnowing,
    afternoonWet,
    afternoonTempF: afternoonTempF ?? tempF,
  }
}

export function getLocationAndWeather(): Promise<WeatherData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      getWeather().then(resolve).catch(reject)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: 'Current location',
        }
        getWeather(coords).then(resolve).catch(reject)
      },
      () => getWeather().then(resolve).catch(reject),  // fall back to Denver
      { timeout: 5000 },
    )
  })
}
