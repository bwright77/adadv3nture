import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getProgram, type ProgramState } from '../../../lib/program-tracker'
import { useWeather } from '../../../hooks/useWeather'

interface WTomorrowProps { dark?: boolean }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOW_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function nextMorningDate() {
  const now = new Date()
  // Before 6am still feels like "tonight" — the morning coming up is today
  if (now.getHours() < 6) return now
  const d = new Date(now)
  d.setDate(d.getDate() + 1)
  return d
}

export function WTomorrow({ dark }: WTomorrowProps) {
  const { user } = useAuth()
  const [program, setProgram] = useState<ProgramState | null>(null)
  const { weather } = useWeather()

  useEffect(() => {
    if (!user) return
    getProgram(user.id).then(setProgram).catch(() => null)
  }, [user])

  const tmrw = nextMorningDate()
  const dow = tmrw.getDay()
  const isMonday = dow === 1
  const dateLabel = `${DOW_FULL[dow]} · ${MONTHS[tmrw.getMonth()]} ${tmrw.getDate()}`

  const tomorrowForecast = weather?.dailyForecast.find(d => d.label === 'Tomorrow')
  const runOk = tomorrowForecast ? tomorrowForecast.highF < 80 : null
  const bikeOk = tomorrowForecast
    ? tomorrowForecast.highF < 90 && !tomorrowForecast.isRaining && !tomorrowForecast.isSnowing
    : null

  // Next strength session title (what's queued for tomorrow)
  const strengthTitle = program?.next_workout_title ?? null
  const parts = strengthTitle ? strengthTitle.split('·').map(p => p.trim()) : []

  return (
    <Glass dark={dark} span={12} pad={14}>
      <CardLabel dark={dark}>Tomorrow · {dateLabel}</CardLabel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
        {/* Run Club callout if Monday */}
        {isMonday && (
          <div className="badge" style={{ fontSize: 'var(--fs-15)' }}>
            RUN CLUB · WASH PARK · 6PM{' '}
            <span style={{ color: C.teal }}>SACRED</span>
          </div>
        )}

        {/* Strength session */}
        {strengthTitle && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="badge" style={{
              fontSize: isMonday ? 11 : 13,
              color: dark ? C.cream : C.dark,
            }}>
              {parts[0]}
            </span>
            {parts[1] && (
              <span className="mono" style={{ fontSize: 'var(--fs-12)', color: C.teal }}>
                {parts[1]}
              </span>
            )}
            {parts[2] && (
              <span className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.6 }}>
                · {parts[2]}
              </span>
            )}
          </div>
        )}

        {/* Weather routing line */}
        {tomorrowForecast && (
          <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.55, marginTop: 2 }}>
            {DOW_SHORT[dow]} forecast: {tomorrowForecast.highF}° high
            {tomorrowForecast.precipPct > 15 ? ` · ${tomorrowForecast.precipPct}% precip` : ''}
            {runOk !== null ? ` · run ${runOk ? '✓' : '✗'}` : ''}
            {bikeOk !== null ? ` · bike ${bikeOk ? '✓' : '✗'}` : ''}
          </div>
        )}
      </div>
    </Glass>
  )
}
