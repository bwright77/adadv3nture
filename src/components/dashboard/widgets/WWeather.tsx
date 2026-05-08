import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useWeather } from '../../../hooks/useWeather'

interface WWeatherProps { dark?: boolean }

function conditionIcon(condition: string, isRaining: boolean, isSnowing: boolean): string {
  if (isSnowing) return '❄'
  if (isRaining) return '☂'
  if (condition === 'Thunderstorm') return '⚡'
  if (condition === 'Clouds') return '○'
  return '◎'
}

export function WWeather({ dark }: WWeatherProps) {
  const { weather, loading } = useWeather()

  if (loading || !weather) {
    return (
      <Glass dark={dark} span={4} pad={14}>
        <CardLabel dark={dark}>Weather</CardLabel>
        <div style={{ opacity: 0.4, fontSize: 13, marginTop: 8 }}>Loading…</div>
      </Glass>
    )
  }

  const icon = conditionIcon(weather.condition, weather.isRaining, weather.isSnowing)
  const pmLabel = weather.afternoonWet
    ? `4pm: wet · ${weather.afternoonTempF}°`
    : `4pm: dry ✓ · ${weather.afternoonTempF}°`
  const pmColor = weather.afternoonWet ? C.sand : C.teal

  const workoutLine = [
    weather.runOk ? 'run ✓' : `run ✗ (${weather.tempF}°)`,
    weather.bikeOk
      ? 'bike ✓'
      : (weather.isRaining || weather.isSnowing) ? 'bike ✗ (wet)' : `bike ✗ (${weather.tempF}°)`,
  ].join(' · ')

  return (
    <Glass dark={dark} span={4} pad={14}>
      <CardLabel dark={dark}>{weather.label}</CardLabel>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span className="mono" style={{ fontSize: 26, fontWeight: 700, fontFeatureSettings: '"zero" 0' }}>{weather.tempF}°</span>
        <span style={{ fontSize: 12, opacity: 0.6 }}>↑{weather.highF} ↓{weather.lowF}</span>
      </div>
      <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2, textTransform: 'capitalize' }}>
        {weather.description}{weather.windMph > 10 ? ` · ${weather.windMph}mph wind` : ''}
      </div>
      <div className="mono" style={{ fontSize: 11, marginTop: 8, color: pmColor }}>{pmLabel}</div>
      <div className="mono" style={{ fontSize: 11, marginTop: 3, opacity: 0.55 }}>{workoutLine}</div>
    </Glass>
  )
}
