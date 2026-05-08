import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useWeather } from '../../../hooks/useWeather'
import type { DayForecast } from '../../../lib/openweather'

interface WForecastProps { dark?: boolean }

function conditionIcon(day: DayForecast): string {
  if (day.isSnowing) return '❄'
  if (day.isRaining) return '☂'
  if (day.condition === 'Thunderstorm') return '⚡'
  if (day.condition === 'Clouds') return '○'
  return '◎'
}

function DayCol({ day, dark }: { day: DayForecast; dark?: boolean }) {
  const isToday = day.label === 'Today'
  const isTomorrow = day.label === 'Tomorrow'
  const accent = isTomorrow ? C.teal : isToday ? C.rust : undefined

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 3,
      padding: '8px 2px',
      borderRadius: 10,
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
      <div style={{ fontSize: 'var(--fs-16)', lineHeight: 1 }}>{conditionIcon(day)}</div>
      <div className="mono" style={{
        fontSize: 'var(--fs-14)', fontWeight: 700,
        color: accent ?? (dark ? C.cream : C.dark),
      }}>
        {day.highF}°
      </div>
      <div className="mono" style={{
        fontSize: 'var(--fs-12)',
        color: dark ? 'rgba(245,237,214,0.45)' : 'rgba(26,18,8,0.4)',
      }}>
        {day.lowF}°
      </div>
      {day.precipPct > 15 && (
        <div className="mono" style={{
          fontSize: 'var(--fs-10)',
          color: dark ? 'rgba(91,188,184,0.8)' : C.teal,
          marginTop: 1,
        }}>
          {day.precipPct}%
        </div>
      )}
    </div>
  )
}

export function WForecast({ dark }: WForecastProps) {
  const { weather, loading } = useWeather()

  if (loading || !weather) {
    return (
      <Glass dark={dark} span={6} style={{ height: 148 }} pad={14}>
        <CardLabel dark={dark}>Forecast</CardLabel>
        <div style={{ opacity: 0.4, fontSize: 'var(--fs-13)', marginTop: 8 }}>Loading…</div>
      </Glass>
    )
  }

  const days = weather.dailyForecast.slice(0, 5)
  const tomorrow = days.find(d => d.label === 'Tomorrow')
  const tomorrowRunOk = tomorrow ? tomorrow.highF < 80 : null
  const tomorrowBikeOk = tomorrow ? (tomorrow.highF < 90 && !tomorrow.isRaining && !tomorrow.isSnowing) : null

  return (
    <Glass dark={dark} span={6} style={{ height: 148 }} pad={12}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <CardLabel dark={dark}>Forecast</CardLabel>
        {tomorrow && (
          <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.55 }}>
            tmrw: {tomorrowRunOk ? 'run ✓' : 'run ✗'} · {tomorrowBikeOk ? 'bike ✓' : 'bike ✗'}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
        {days.map(day => (
          <DayCol key={day.date} day={day} dark={dark} />
        ))}
      </div>
    </Glass>
  )
}
