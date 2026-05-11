import { DEFAULT_LOCATION, resolveLocation, type ResolvedLocation } from './locations'

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

  // Today's high/low from forecast (next 24h slots)
  const todaySlots = forecast.list.slice(0, 8)
  const temps = todaySlots.map(s => s.main.temp)
  const forecastHigh = Math.round(Math.max(current.main.temp_max, ...temps))
  const forecastLow = Math.round(Math.min(current.main.temp_min, ...temps))

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
    bikeOk: tempF < 90 && !isRaining && !isSnowing,
    afternoonWet,
    afternoonTempF: afternoonTempF ?? tempF,
    dailyForecast,
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
        const loc = resolveLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        getWeather(loc).then(resolve).catch(reject)
      },
      () => getWeather().then(resolve).catch(reject),  // fall back to Denver
      { timeout: 5000 },
    )
  })
}
