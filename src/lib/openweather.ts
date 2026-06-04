import { DEFAULT_LOCATION, type ResolvedLocation } from './locations'

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string

export interface DayForecast {
  date: string             // 'YYYY-MM-DD'
  label: string            // 'Today' | 'Tomorrow' | 'Mon' | 'Tue' | etc.
  highF: number
  lowF: number
  condition: string
  precipPct: number        // 0–100, max pop across slots
  isRaining: boolean
  isSnowing: boolean
}

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
  // Multi-day forecast
  dailyForecast: DayForecast[]
}

interface OWMCurrent {
  main: { temp: number; temp_min: number; temp_max: number }
  weather: { main: string; description: string }[]
  wind: { speed: number }
  name: string
  // OpenWeather only includes these when precipitation occurred recently.
  // Volume in mm over the past hour / past three hours respectively.
  rain?: { '1h'?: number; '3h'?: number }
  snow?: { '1h'?: number; '3h'?: number }
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

// Colorado bounding box — a backstop when a geocode result lacks a state field.
const CO_BBOX = { latMin: 36.99, latMax: 41.01, lonMin: -109.07, lonMax: -102.03 }
const inColorado = (r: { lat: number; lon: number; state?: string }): boolean =>
  r.state === 'Colorado' ||
  (r.lat >= CO_BBOX.latMin && r.lat <= CO_BBOX.latMax && r.lon >= CO_BBOX.lonMin && r.lon <= CO_BBOX.lonMax)

// Forward-geocode a place name (a town / trail area) to coordinates via the
// OpenWeather Geocoding API, constrained to Colorado — many CO town names
// (Morrison, Evergreen, Breckenridge, Buena Vista…) also exist in bigger states
// and the `,CO,US` query bias is NOT reliably honored, so we fetch several
// candidates and keep the first that's actually in Colorado. Town-level accuracy
// — enough to place a hike for proximity, not exact trailhead. Null on miss.
export async function geocodePlace(query: string): Promise<{ lat: number; lon: number } | null> {
  const q = query.trim()
  if (!q || !API_KEY) return null
  // Try each slash-separated token ("Sanpiero/Grand Junction" → try both) and
  // keep the first that resolves to a Colorado place.
  for (const token of q.split('/').map(t => t.trim()).filter(Boolean)) {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(`${token}, CO, US`)}&limit=5&appid=${API_KEY}`
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = (await res.json()) as { lat: number; lon: number; state?: string }[]
      const co = Array.isArray(data) ? data.find(inColorado) : null
      if (co) return { lat: co.lat, lon: co.lon }
    } catch {
      // try next token
    }
  }
  return null
}

export async function getWeather(loc: ResolvedLocation = DEFAULT_LOCATION): Promise<WeatherData> {

  const base = `https://api.openweathermap.org/data/2.5`
  const params = `lat=${loc.lat}&lon=${loc.lon}&appid=${API_KEY}&units=imperial`

  const [current, forecast] = await Promise.all([
    fetchJSON<OWMCurrent>(`${base}/weather?${params}`),
    fetchJSON<OWMForecast>(`${base}/forecast?${params}&cnt=40`),
  ])

  const condition = current.weather[0]?.main ?? 'Clear'
  const description = current.weather[0]?.description ?? ''
  const tempF = Math.round(current.main.temp)
  const windMph = Math.round((current.wind.speed ?? 0) * 1)  // already mph in imperial
  const isRaining = ['Rain', 'Drizzle', 'Thunderstorm'].includes(condition)
  const isSnowing = condition === 'Snow'

  // Recent precip — past 3 hours per OpenWeather's "current" payload. Even if
  // it's dry right now, ground/trails are likely wet if it rained or snowed
  // in the last few hours.
  const recentlyWet =
    (current.rain?.['3h'] ?? current.rain?.['1h'] ?? 0) > 0 ||
    (current.snow?.['3h'] ?? current.snow?.['1h'] ?? 0) > 0

  // Today's high/low from forecast (next 24h slots)
  const todaySlots = forecast.list.slice(0, 8)
  const temps = todaySlots.map(s => s.main.temp)
  const forecastHigh = Math.round(Math.max(current.main.temp_max, ...temps))
  const forecastLow = Math.round(Math.min(current.main.temp_min, ...temps))

  // Any wet weather forecast for the rest of today — bike is no-go if any
  // slot until midnight shows rain/snow or > 30% probability.
  const todayLocal = new Date().toDateString()
  const todayRemainingWet = forecast.list
    .filter(s => new Date(s.dt * 1000).toDateString() === todayLocal)
    .some(s => s.pop > 0.3 || ['Rain', 'Drizzle', 'Thunderstorm', 'Snow'].includes(s.weather[0]?.main ?? ''))

  // Afternoon window: slots roughly 3pm–6pm local
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

  // Group 3-hour slots into daily forecasts (next 5 days)
  const dayMap = new Map<string, OWMForecastItem[]>()
  for (const slot of forecast.list) {
    const d = new Date(slot.dt * 1000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const arr = dayMap.get(key) ?? []
    arr.push(slot)
    dayMap.set(key, arr)
  }

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const tomorrowDate = new Date(today)
  tomorrowDate.setDate(today.getDate() + 1)
  const tomorrowKey = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const dailyForecast: DayForecast[] = []
  for (const [dateKey, slots] of dayMap) {
    if (dailyForecast.length >= 5) break
    const temps = slots.map(s => s.main.temp)
    const dayHigh = Math.round(Math.max(...temps))
    const dayLow = Math.round(Math.min(...temps))
    const maxPop = Math.round(Math.max(...slots.map(s => s.pop)) * 100)
    // Dominant condition: prefer precipitation conditions over clear
    const conditionCounts = slots.reduce((acc, s) => {
      const c = s.weather[0]?.main ?? 'Clear'
      acc[c] = (acc[c] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    const precipConditions = ['Thunderstorm', 'Rain', 'Drizzle', 'Snow']
    const dayCondition = precipConditions.find(c => conditionCounts[c]) ??
      Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Clear'

    let label: string
    if (dateKey === todayKey) label = 'Today'
    else if (dateKey === tomorrowKey) label = 'Tomorrow'
    else {
      const d = new Date(dateKey + 'T12:00:00')
      label = DOW[d.getDay()]
    }

    dailyForecast.push({
      date: dateKey,
      label,
      highF: dayHigh,
      lowF: dayLow,
      condition: dayCondition,
      precipPct: maxPop,
      isRaining: ['Rain', 'Drizzle', 'Thunderstorm'].includes(dayCondition),
      isSnowing: dayCondition === 'Snow',
    })
  }

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
    // Bike is no-go if it's currently wet, recently was wet (past ~3h),
    // or any wetness is forecast through end of today.
    bikeOk: tempF < 90 && !isRaining && !isSnowing && !recentlyWet && !todayRemainingWet,
    afternoonWet,
    afternoonTempF: afternoonTempF ?? tempF,
    dailyForecast,
  }
}

