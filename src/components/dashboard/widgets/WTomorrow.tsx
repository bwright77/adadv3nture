import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getAllPrograms, type ProgramState } from '../../../lib/program-tracker'
import { getCurrentTrainingWeek, type TrainingWeek } from '../../../lib/training'
import { loadRecovery } from '../../../lib/recovery'
import { useWeather } from '../../../hooks/useWeather'
import { supabase } from '../../../lib/supabase'

type ListTab = 'training' | 'career' | 'family' | 'home' | 'projects'

interface WTomorrowProps { dark?: boolean; onNavigate?: (tab: ListTab) => void }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOW_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function nextMorningDate() {
  const now = new Date()
  if (now.getHours() < 6) return now
  const d = new Date(now)
  d.setDate(d.getDate() + 1)
  return d
}

function thisWeekMonday(): string {
  const today = new Date()
  const d = new Date(today)
  d.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return d.toISOString().substring(0, 10)
}

interface WeekSummary {
  runMiles: number
  rideMiles: number
  strengthSessions: number
  longRunMiles: number  // longest run this week
}

interface Rec {
  type: 'long_run' | 'run' | 'ride' | 'strength' | 'rest'
  headline: string
  why: string
  program?: string
}

function buildRec(params: {
  week: TrainingWeek | null
  actuals: WeekSummary
  recoveryTier: string
  runOk: boolean | null
  bikeOk: boolean | null
  programs: ProgramState[]
  dow: number  // tomorrow's dow
}): Rec {
  const { week, actuals, recoveryTier, runOk, bikeOk, programs, dow } = params

  // Recovery gates everything outdoor
  if (recoveryTier === 'recovery') {
    const strengthLeft = (week?.target_strength_sessions ?? 0) - actuals.strengthSessions
    if (strengthLeft > 0 && programs.length > 0) {
      return {
        type: 'strength',
        headline: 'Strength — recovery day',
        why: 'Body needs rest · indoor session fits',
        program: programs[0].next_workout_title ?? undefined,
      }
    }
    return { type: 'rest', headline: 'Rest or easy walk', why: 'Recovery score is low — protect the adaptation' }
  }

  const targetLongRun = week?.target_long_run_miles ?? null
  const targetRun = week?.target_run_miles ?? null
  const targetRide = week?.target_cycling_miles ?? null
  const targetStrength = week?.target_strength_sessions ?? 0

  const longRunDone = targetLongRun ? actuals.longRunMiles >= targetLongRun * 0.8 : actuals.longRunMiles >= 8
  const runGap = targetRun ? Math.max(0, targetRun - actuals.runMiles) : 0
  const rideGap = targetRide ? Math.max(0, targetRide - actuals.rideMiles) : 0
  const strengthLeft = Math.max(0, targetStrength - actuals.strengthSessions)

  // Long run: weekend or if it's the most pressing gap
  const isWeekend = dow === 0 || dow === 6
  const longRunTarget = targetLongRun ?? 10
  if (!longRunDone && (isWeekend || runGap >= longRunTarget * 0.8)) {
    if (runOk !== false) {
      return {
        type: 'long_run',
        headline: `Long run · ~${longRunTarget}mi`,
        why: targetLongRun
          ? `${longRunTarget}mi target not done this week`
          : 'Long effort not done this week · WLW training',
      }
    }
  }

  // Run gap
  if (runGap >= 2 && runOk !== false) {
    return {
      type: 'run',
      headline: `Run · ~${Math.round(runGap)}mi to go`,
      why: `${actuals.runMiles.toFixed(1)} of ${targetRun}mi run this week`,
    }
  }

  // Ride gap
  if (rideGap >= 5 && bikeOk !== false) {
    return {
      type: 'ride',
      headline: `Ride · ~${Math.round(rideGap)}mi to go`,
      why: `${actuals.rideMiles.toFixed(0)} of ${targetRide}mi ridden this week`,
    }
  }

  // Strength
  if (strengthLeft > 0 && programs.length > 0) {
    return {
      type: 'strength',
      headline: `Strength · ${strengthLeft} session${strengthLeft > 1 ? 's' : ''} left`,
      why: `${actuals.strengthSessions} of ${targetStrength} done this week`,
      program: programs[0].next_workout_title ?? undefined,
    }
  }

  // Week targets met or no targets set
  if (!week) {
    return { type: 'rest', headline: 'No targets set this week', why: 'Add a training week in the Training tab' }
  }
  return { type: 'rest', headline: 'Week targets on track', why: 'All targets met — free choice tomorrow' }
}

const REC_ICON: Record<Rec['type'], string> = {
  long_run: '🏃', run: '🏃', ride: '🚴', strength: '🏋️', rest: '🛌',
}

export function WTomorrow({ dark, onNavigate }: WTomorrowProps) {
  const { user } = useAuth()
  const [week, setWeek] = useState<TrainingWeek | null>(null)
  const [actuals, setActuals] = useState<WeekSummary>({ runMiles: 0, rideMiles: 0, strengthSessions: 0, longRunMiles: 0 })
  const [programs, setPrograms] = useState<ProgramState[]>([])
  const [recoveryTier, setRecoveryTier] = useState<string>('unknown')
  const { weather } = useWeather()

  useEffect(() => {
    if (!user) return
    const monday = thisWeekMonday()
    const today = new Date().toISOString().substring(0, 10)

    Promise.allSettled([
      getCurrentTrainingWeek(user.id),
      getAllPrograms(user.id),
      loadRecovery(user.id),
      (supabase as any)
        .from('activities')
        .select('activity_type, distance_miles')
        .eq('user_id', user.id)
        .gte('activity_date', monday)
        .lte('activity_date', today),
    ]).then(([weekRes, programsRes, recoveryRes, activitiesRes]) => {
      const w = weekRes.status === 'fulfilled' ? weekRes.value : null
      setWeek(w)
      setPrograms(programsRes.status === 'fulfilled' ? programsRes.value : [])
      if (recoveryRes.status === 'fulfilled') {
        setRecoveryTier(recoveryRes.value.tier ?? 'unknown')
      }
      const acts = activitiesRes.status === 'fulfilled' ? (activitiesRes.value.data ?? []) : []
      const summary: WeekSummary = { runMiles: 0, rideMiles: 0, strengthSessions: 0, longRunMiles: 0 }
      for (const a of acts as { activity_type: string; distance_miles: number | null }[]) {
        const mi = a.distance_miles ?? 0
        if (a.activity_type === 'run') {
          summary.runMiles += mi
          if (mi > summary.longRunMiles) summary.longRunMiles = mi
        } else if (a.activity_type === 'ride') {
          summary.rideMiles += mi
        } else if (a.activity_type === 'strength') {
          summary.strengthSessions += 1
        }
      }
      setActuals(summary)
    })
  }, [user])

  const tmrw = nextMorningDate()
  const dow = tmrw.getDay()
  const isMonday = dow === 1
  const dateLabel = `${DOW_FULL[dow]} · ${MONTHS[tmrw.getMonth()]} ${tmrw.getDate()}`

  const tomorrowForecast = weather?.dailyForecast.find(d => d.label === 'Tomorrow')
  const runOk = tomorrowForecast ? tomorrowForecast.highF < 85 && !tomorrowForecast.isRaining : null
  const bikeOk = tomorrowForecast
    ? tomorrowForecast.highF < 95 && !tomorrowForecast.isRaining && !tomorrowForecast.isSnowing
    : null

  const rec = buildRec({ week, actuals, recoveryTier, runOk, bikeOk, programs, dow })

  return (
    <Glass dark={dark} span={12} pad={14}>
      <CardLabel dark={dark}>Tomorrow · {dateLabel}</CardLabel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
        {isMonday && (
          <div className="badge" style={{ fontSize: 'var(--fs-15)' }}>
            RUN CLUB · WASH PARK · 6PM{' '}
            <span style={{ color: C.teal }}>SACRED</span>
          </div>
        )}

        {/* Recommendation headline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{REC_ICON[rec.type]}</span>
          <span className="badge" style={{ fontSize: 'var(--fs-15)', color: dark ? C.cream : C.dark }}>
            {rec.headline}
          </span>
        </div>

        {/* Why line — clickable when it's the "no training week set" empty state */}
        {(() => {
          const noWeek = rec.headline === 'No targets set this week' && !!onNavigate
          if (noWeek) {
            return (
              <button
                onClick={() => onNavigate?.('training')}
                style={{
                  marginLeft: 24, padding: 0, background: 'none', border: 'none',
                  textAlign: 'left', cursor: 'pointer', color: C.teal,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 'var(--fs-11)',
                  textDecoration: 'underline', textUnderlineOffset: 2,
                }}
              >
                {rec.why} ↗
              </button>
            )
          }
          return (
            <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.55, marginLeft: 24 }}>
              {rec.why}
            </div>
          )
        })()}

        {/* Program detail when strength is the rec */}
        {rec.program && (
          <div className="mono" style={{
            fontSize: 'var(--fs-11)', color: C.teal, marginLeft: 24,
          }}>
            {rec.program}
          </div>
        )}

        {/* Weather line */}
        {tomorrowForecast && (
          <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.5, marginTop: 2 }}>
            {DOW_SHORT[dow]} {tomorrowForecast.highF}°
            {tomorrowForecast.precipPct > 15 ? ` · ${tomorrowForecast.precipPct}% precip` : ''}
            {runOk !== null ? ` · run ${runOk ? '✓' : '✗'}` : ''}
            {bikeOk !== null ? ` · bike ${bikeOk ? '✓' : '✗'}` : ''}
          </div>
        )}
      </div>
    </Glass>
  )
}
