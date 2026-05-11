import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { C } from '../../../tokens'
import { getWeather, type WeatherData, type DayForecast } from '../../../lib/openweather'

interface Props { dark?: boolean }

const LOCATIONS = [
  { lat: 39.7392, lon: -104.9903, label: 'Denver', elev: '5,318ft', mode: 'road' as const },
  { lat: 38.4339, lon: -105.8295, label: 'Howard', elev: '6,490ft', mode: 'trail' as const },
]

function conditionIcon(w: WeatherData): string {
  if (w.isSnowing) return '❄'
  if (w.isRaining) return '☂'
  if (w.condition === 'Thunderstorm') return '⚡'
  if (w.condition === 'Clouds') return '○'
  return '◎'
}

function forecastIcon(day: DayForecast): string {
  if (day.isSnowing) return '❄'
  if (day.isRaining) return '☂'
  if (day.condition === 'Thunderstorm') return '⚡'
  if (day.condition === 'Clouds') return '○'
  return '◎'
}

function activityLine(w: WeatherData, mode: 'road' | 'trail'): { text: string; ok: boolean }[] {
  const storm = w.condition === 'Thunderstorm'
  if (mode === 'road') {
    return [
      { text: `run ${w.runOk && !storm ? '✓' : '✗'}`, ok: w.runOk && !storm },
      { text: `bike ${w.bikeOk && !storm ? '✓' : '✗'}`, ok: w.bikeOk && !storm },
    ]
  }
  const hikeOk = !storm && w.tempF > 24
  const trailOk = !storm && w.tempF > 28
  return [
    { text: `trail ${trailOk ? '✓' : '✗'}`, ok: trailOk },
    { text: `hike ${hikeOk ? '✓' : '✗'}`, ok: hikeOk },
  ]
}

function LocationCard({ w, mode, dark }: { w: WeatherData; mode: 'road' | 'trail'; dark?: boolean }) {
  const icon = conditionIcon(w)
  const activities = activityLine(w, mode)
  const subColor = dark ? 'rgba(245,237,214,0.55)' : C.ink60

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="mono" style={{
        fontSize: 'var(--fs-10)', letterSpacing: '0.1em',
        color: dark ? 'rgba(245,237,214,0.5)' : C.ink40,
        marginBottom: 6,
      }}>
        {w.label.toUpperCase()}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span className="mono" style={{
          fontSize: 'var(--fs-26)', fontWeight: 700, lineHeight: 1,
          fontFeatureSettings: '"zero" 0',
          color: dark ? C.cream : C.dark,
        }}>
          {w.tempF}°
        </span>
        <span className="mono" style={{ fontSize: 'var(--fs-11)', color: subColor }}>
          ↑{w.highF}° ↓{w.lowF}°
        </span>
      </div>
      <div className="mono" style={{
        fontSize: 'var(--fs-11)', color: subColor,
        textTransform: 'capitalize', marginBottom: 3,
      }}>
        {w.description}{w.windMph > 8 ? ` · ${w.windMph}mph` : ''}
      </div>
      <div className="mono" style={{ fontSize: 'var(--fs-11)', display: 'flex', gap: 8 }}>
        {activities.map(a => (
          <span key={a.text} style={{ color: a.ok ? C.teal : C.rust }}>{a.text}</span>
        ))}
      </div>
    </div>
  )
}

function DayCol({ day, dark }: { day: DayForecast; dark?: boolean }) {
  const isToday = day.label === 'Today'
  const isTomorrow = day.label === 'Tomorrow'
  const accent = isTomorrow ? C.teal : isToday ? C.rust : undefined

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 3,
      padding: '6px 2px',
      borderRadius: 8,
      background: isTomorrow
        ? (dark ? 'rgba(91,188,184,0.12)' : 'rgba(91,188,184,0.10)')
        : 'transparent',
    }}>
      <div className="mono" style={{
        fontSize: 'var(--fs-10)', letterSpacing: '0.05em',
        color: accent ?? (dark ? 'rgba(245,237,214,0.5)' : 'rgba(26,18,8,0.45)'),
        fontWeight: isTomorrow ? 700 : 400,
      }}>
        {day.label.toUpperCase()}
      </div>
      <div style={{ fontSize: 'var(--fs-15)', lineHeight: 1 }}>{forecastIcon(day)}</div>
      <div className="mono" style={{
        fontSize: 'var(--fs-13)', fontWeight: 700,
        color: accent ?? (dark ? C.cream : C.dark),
      }}>
        {day.highF}°
      </div>
      <div className="mono" style={{
        fontSize: 'var(--fs-11)',
        color: dark ? 'rgba(245,237,214,0.45)' : 'rgba(26,18,8,0.4)',
      }}>
        {day.lowF}°
      </div>
      {day.precipPct > 15 && (
        <div className="mono" style={{
          fontSize: 'var(--fs-10)',
          color: dark ? 'rgba(91,188,184,0.8)' : C.teal,
        }}>
          {day.precipPct}%
        </div>
      )}
    </div>
  )
}

export function WWeatherFull({ dark }: Props) {
  const [conditions, setConditions] = useState<(WeatherData | null)[]>([null, null])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled(
      LOCATIONS.map(loc => getWeather({
        lat: loc.lat,
        lon: loc.lon,
        name: loc.label,
        elevationFt: parseInt(loc.elev.replace(/[^\d]/g, ''), 10) || null,
        label: `${loc.label} · ${loc.elev}`,
        isKnown: true,
      }))
    ).then(results => {
      setConditions(results.map(r => r.status === 'fulfilled' ? r.value : null))
      setLoading(false)
    })
  }, [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).toUpperCase()

  const denverData = conditions[0]
  const forecast = denverData?.dailyForecast?.slice(0, 5) ?? []
  const dividerColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,18,8,0.1)'

  return (
    <Glass dark={dark} span={12} pad={16}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, background: C.rust, borderRadius: 1 }} />
          <span className="mono" style={{
            fontSize: 'var(--fs-10)', letterSpacing: '0.14em',
            color: dark ? 'rgba(245,237,214,0.7)' : C.ink60,
          }}>
            CONDITIONS
          </span>
        </div>
        <span className="mono" style={{
          fontSize: 'var(--fs-10)',
          color: dark ? 'rgba(245,237,214,0.4)' : C.ink40,
        }}>
          {today}
        </span>
      </div>

      {loading ? (
        <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.4 }}>Loading…</div>
      ) : (
        <>
          {/* Dual-location conditions */}
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14 }}>
            {LOCATIONS.map((loc, i) => (
              <div key={loc.label} style={{ display: 'flex', flex: 1, minWidth: 0 }}>
                {i > 0 && (
                  <div style={{ width: 1, background: dividerColor, margin: '0 16px', alignSelf: 'stretch' }} />
                )}
                {conditions[i]
                  ? <LocationCard w={conditions[i]!} mode={loc.mode} dark={dark} />
                  : (
                    <div style={{ flex: 1 }}>
                      <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.4, marginBottom: 6, letterSpacing: '0.1em' }}>
                        {loc.label.toUpperCase()}
                      </div>
                      <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.35 }}>unavailable</div>
                    </div>
                  )
                }
              </div>
            ))}
          </div>

          {/* Divider */}
          {forecast.length > 0 && (
            <div style={{ height: 1, background: dividerColor, marginBottom: 10 }} />
          )}

          {/* 5-day forecast strip */}
          {forecast.length > 0 && (
            <div style={{ display: 'flex', gap: 2 }}>
              {forecast.map(day => (
                <DayCol key={day.date} day={day} dark={dark} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="mono" style={{
        fontSize: 9, letterSpacing: '0.06em', opacity: 0.3, marginTop: 10,
        color: dark ? C.cream : C.dark,
      }}>
        DENVER 5,318FT · HOWARD 6,490FT
      </div>
    </Glass>
  )
}
