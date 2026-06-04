import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getCurrentTrainingWeek, getAllTrainingWeeks, type TrainingWeek } from '../../../lib/training'
import { templateForDow, computeWeekProgress, classifyPrimary, type WeekProgress } from '../../../lib/training-templates'
import { deriveRotationIndex, thursdayPrescription, PELOTON_SYNC_WARNING } from '../../../lib/thursdayRotation'
import { loadRecovery } from '../../../lib/recovery'
import { useWeather } from '../../../hooks/useWeather'
import { supabase } from '../../../lib/supabase'
import { logicalToday } from '../../../lib/utils'

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

interface Rec {
  type: 'long_run' | 'run' | 'ride' | 'strength' | 'rest'
  headline: string
  why: string
  program?: string
}

// Build the recommendation by leading with the plan's day-of-week template
// and falling through to the most-undone item when the template's prescription
// is already fulfilled this week (swap-aware). Recovery / weather override
// at the end.
// Strength label is the week's prescription (e.g. "2× Row Bootcamp") — strength
// is part of the weekly schedule now, not a tracked program.
function strengthLabel(week: TrainingWeek | null): string {
  return week?.strength_prescription ?? 'Row Bootcamp'
}

function buildRec(params: {
  week: TrainingWeek | null
  progress: WeekProgress
  recoveryTier: string
  runOk: boolean | null
  bikeOk: boolean | null
  dow: number  // tomorrow's dow
}): Rec {
  const { week, progress, recoveryTier, runOk, bikeOk, dow } = params

  // Recovery is the trump card — always respect it.
  if (recoveryTier === 'recovery') {
    const strengthLeft = (week?.target_strength_sessions ?? 0) - progress.strengthCount
    if (strengthLeft > 0) {
      return {
        type: 'strength', headline: 'Strength — recovery day',
        why: 'Body needs rest · indoor session fits',
        program: strengthLabel(week),
      }
    }
    return { type: 'rest', headline: 'Rest or easy walk', why: 'Recovery score is low — protect the adaptation' }
  }

  // Without a phase-tagged plan week, use the legacy gap math.
  if (!week || !week.phase_id) {
    return legacyGapRec(week, progress, runOk, bikeOk)
  }

  const phase = week.phase_id
  const template = templateForDow(phase, dow)
  const targetStrength = week.target_strength_sessions ?? 0
  const strengthLeft = Math.max(0, targetStrength - progress.strengthCount)

  // Classify the template's primary so we know what we're suggesting.
  const kind = classifyPrimary(template.primary)

  // Is the prescribed primary already satisfied elsewhere this week?
  const alreadyDone =
    (kind === 'long_run'   && progress.longRunDone) ||
    (kind === 'pz_max'     && progress.pzMaxDone) ||
    (kind === 'strength'   && strengthLeft <= 0)

  if (alreadyDone) {
    return swapRec(week, progress, runOk, bikeOk)
  }

  // Render the prescribed primary, with light overrides for weather.
  switch (kind) {
    case 'long_run': {
      if (runOk === false) {
        return { type: 'ride', headline: 'Indoor: PZ Endurance or row', why: 'Weather blocks the long run — swap to indoor Z2' }
      }
      const mi = week.target_long_run_miles ?? null
      return {
        type: 'long_run',
        headline: mi ? `Long run · ${mi}mi` : 'Long run',
        why: template.sub ?? 'Plan-prescribed long run',
      }
    }
    case 'pz_max':
      return { type: 'ride', headline: template.primary, why: template.sub ?? 'Primary midweek quality' }
    case 'strength':
      return {
        type: 'strength',
        headline: template.primary,
        why: strengthLeft > 0 ? `${strengthLeft} session${strengthLeft > 1 ? 's' : ''} left this week` : (template.sub ?? ''),
        program: strengthLabel(week),
      }
    case 'race':
      return { type: 'long_run', headline: template.primary, why: template.sub ?? 'Race day' }
    case 'run_quality':
      if (runOk === false) {
        return { type: 'ride', headline: 'Indoor: PZ Max', why: 'Weather blocks outdoor quality — swap to PZ Max' }
      }
      return { type: 'run', headline: template.primary, why: template.sub ?? 'Plan-prescribed quality' }
    case 'easy_run':
      return { type: 'run', headline: template.primary, why: template.sub ?? 'Easy day' }
    case 'easy_bike':
      return { type: 'ride', headline: template.primary, why: template.sub ?? 'Easy alt-mode' }
    case 'rest':
      return { type: 'rest', headline: template.primary, why: template.sub ?? 'Plan-prescribed rest' }
    default:
      return { type: 'run', headline: template.primary, why: template.sub ?? '' }
  }
}

// When tomorrow's primary is already done elsewhere this week, fall through
// to the next-most-pressing item in priority order: long run → PZ Max →
// strength → run miles → ride miles → free choice.
function swapRec(
  week: TrainingWeek,
  progress: WeekProgress,
  runOk: boolean | null,
  bikeOk: boolean | null,
): Rec {
  const longRunTarget = week.target_long_run_miles ?? 0
  const targetStrength = week.target_strength_sessions ?? 0
  const strengthLeft = Math.max(0, targetStrength - progress.strengthCount)
  const runGap = Math.max(0, (week.target_run_miles ?? 0) - progress.runMiles)
  const rideGap = Math.max(0, (week.target_cycling_miles ?? 0) - progress.bikeMiles)

  if (!progress.longRunDone && longRunTarget > 0 && runOk !== false) {
    return {
      type: 'long_run',
      headline: `Long run · ${longRunTarget}mi`,
      why: `Swap: today's primary already done — long run still open`,
    }
  }
  if (!progress.pzMaxDone) {
    return { type: 'ride', headline: 'PZ Max · 30–45 min', why: "Swap: today's primary already done — PZ Max still open" }
  }
  if (strengthLeft > 0) {
    return {
      type: 'strength',
      headline: `Strength · ${strengthLeft} session${strengthLeft > 1 ? 's' : ''} left`,
      why: 'Swap: keep the strength count on pace',
      program: strengthLabel(week),
    }
  }
  if (runGap >= 2 && runOk !== false) {
    return { type: 'run', headline: `Easy run · ~${Math.round(runGap)}mi to go`, why: `${progress.runMiles.toFixed(1)} of ${week.target_run_miles}mi this week` }
  }
  if (rideGap >= 5 && bikeOk !== false) {
    return { type: 'ride', headline: `Bike · ~${Math.round(rideGap)}mi to go`, why: `${progress.bikeMiles.toFixed(0)} of ${week.target_cycling_miles}mi this week` }
  }
  return { type: 'rest', headline: 'Week targets on track', why: 'All prescriptions met — free choice tomorrow' }
}

// Fallback when there's no phase-tagged plan week (legacy derived path).
function legacyGapRec(
  week: TrainingWeek | null,
  progress: WeekProgress,
  runOk: boolean | null,
  bikeOk: boolean | null,
): Rec {
  if (!week) {
    return { type: 'rest', headline: 'No targets set this week', why: 'Add a training week in the Training tab' }
  }
  const longRunTarget = week.target_long_run_miles ?? 0
  const runGap = Math.max(0, (week.target_run_miles ?? 0) - progress.runMiles)
  const rideGap = Math.max(0, (week.target_cycling_miles ?? 0) - progress.bikeMiles)
  const strengthLeft = Math.max(0, (week.target_strength_sessions ?? 0) - progress.strengthCount)

  if (!progress.longRunDone && longRunTarget > 0 && runOk !== false) {
    return { type: 'long_run', headline: `Long run · ${longRunTarget}mi`, why: `${longRunTarget}mi target not done this week` }
  }
  if (runGap >= 2 && runOk !== false) {
    return { type: 'run', headline: `Run · ~${Math.round(runGap)}mi to go`, why: `${progress.runMiles.toFixed(1)} of ${week.target_run_miles}mi this week` }
  }
  if (rideGap >= 5 && bikeOk !== false) {
    return { type: 'ride', headline: `Ride · ~${Math.round(rideGap)}mi to go`, why: `${progress.bikeMiles.toFixed(0)} of ${week.target_cycling_miles}mi this week` }
  }
  if (strengthLeft > 0) {
    return {
      type: 'strength', headline: `Strength · ${strengthLeft} session${strengthLeft > 1 ? 's' : ''} left`,
      why: `${progress.strengthCount} of ${week.target_strength_sessions} done this week`,
      program: strengthLabel(week),
    }
  }
  return { type: 'rest', headline: 'Week targets on track', why: 'All targets met — free choice tomorrow' }
}

const REC_ICON: Record<Rec['type'], string> = {
  long_run: '🏃', run: '🏃', ride: '🚴', strength: '🏋️', rest: '🛌',
}

export function WTomorrow({ dark, onNavigate }: WTomorrowProps) {
  const { user } = useAuth()
  const [week, setWeek] = useState<TrainingWeek | null>(null)
  const [progress, setProgress] = useState<WeekProgress>({ longRunDone: false, pzMaxDone: false, strengthCount: 0, runMiles: 0, bikeMiles: 0 })
  const [recoveryTier, setRecoveryTier] = useState<string>('unknown')
  const [rotationIndex, setRotationIndex] = useState<number | null>(null)
  const { weather } = useWeather()

  useEffect(() => {
    if (!user) return
    const monday = thisWeekMonday()
    const today = logicalToday()

    Promise.allSettled([
      getCurrentTrainingWeek(user.id),
      loadRecovery(user.id),
      (supabase as any)
        .from('activities')
        // title + duration detect PZ Max / Climb Ride / strength + bootcamp;
        // activity_date dedupes strength sessions by day.
        .select('activity_type, activity_date, title, distance_miles, duration_seconds')
        .eq('user_id', user.id)
        .gte('activity_date', monday)
        .lte('activity_date', today),
      getAllTrainingWeeks(user.id),
    ]).then(async ([weekRes, recoveryRes, activitiesRes, weeksRes]) => {
      const w = weekRes.status === 'fulfilled' ? weekRes.value : null
      setWeek(w)
      if (recoveryRes.status === 'fulfilled') {
        setRecoveryTier(recoveryRes.value.tier ?? 'unknown')
      }
      const acts = activitiesRes.status === 'fulfilled' ? (activitiesRes.value.data ?? []) : []
      setProgress(computeWeekProgress(w, acts as Parameters<typeof computeWeekProgress>[1]))

      // Thursday rotation pointer — count completed Thursday quality sessions
      // since plan start (consistent with the Training tab's derivation).
      const weeks = weeksRes.status === 'fulfilled' ? weeksRes.value : []
      const planStart = weeks[0]?.week_start
      if (planStart) {
        const { data } = await (supabase as any)
          .from('activities')
          .select('activity_type, activity_date')
          .eq('user_id', user.id)
          .gte('activity_date', planStart)
          .lte('activity_date', today)
        setRotationIndex(deriveRotationIndex((data ?? []) as { activity_type: string; activity_date: string }[], planStart))
      }
    })
  }, [user])

  const tmrw = nextMorningDate()
  const dow = tmrw.getDay()
  const isMonday = dow === 1
  const dateLabel = `${DOW_FULL[dow]} · ${MONTHS[tmrw.getMonth()]} ${tmrw.getDate()}`

  const tomorrowForecast = weather?.dailyForecast.find(d => d.label === 'Tomorrow')
  // Running in the rain is fine — runOk is temperature-only. Bike still
  // flags any rain/snow because wet roads/trails take time to dry.
  const runOk = tomorrowForecast ? tomorrowForecast.highF < 85 : null
  const bikeOk = tomorrowForecast
    ? tomorrowForecast.highF < 95 && !tomorrowForecast.isRaining && !tomorrowForecast.isSnowing
    : null

  const rec = buildRec({ week, progress, recoveryTier, runOk, bikeOk, dow })

  // When tomorrow is Thursday and the plan calls for outdoor quality, surface
  // which rotation type is up (phase-aware) plus the Peloton class + sync note.
  // The full phase/character override lives on the Training tab; here we cover
  // the common phase + down-week cases without loading goals.
  const thursdayRx = (dow === 4 && rotationIndex !== null && rec.type === 'run'
    && (week?.phase_id === 'base' || week?.phase_id === 'build'))
    ? thursdayPrescription({
        phase: week.phase_id,
        characterKind: (week.key_marker ?? '').startsWith('🔽') ? 'recovery' : 'build',
        rotationIndex,
      })
    : null
  if (thursdayRx && !thursdayRx.skip && thursdayRx.type) {
    rec.headline = thursdayRx.type.label
    rec.why = thursdayRx.note || thursdayRx.type.detail
  }

  return (
    <Glass dark={dark} span={12} pad={14} flat style={{ background: C.tealDk, border: 'none' }}>
      <CardLabel dark={dark}>Tomorrow · {dateLabel}</CardLabel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
        {isMonday && (
          <div className="badge" style={{ fontSize: 'var(--fs-15)' }}>
            RUN CLUB · WASH PARK · 6PM{' '}
            <span style={{ color: C.rust }}>SACRED</span>
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
                  textAlign: 'left', cursor: 'pointer', color: C.cream,
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 'var(--fs-11)',
                  textDecoration: 'underline', textUnderlineOffset: 2,
                }}
              >
                {rec.why} ↗
              </button>
            )
          }
          return (
            <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.85, marginLeft: 24 }}>
              {rec.why}
            </div>
          )
        })()}

        {/* Program detail when strength is the rec */}
        {rec.program && (
          <div className="mono" style={{
            fontSize: 'var(--fs-11)', opacity: 0.85, marginLeft: 24,
          }}>
            {rec.program}
          </div>
        )}

        {/* Thursday rotation: Peloton class + Strava sync reminder */}
        {thursdayRx && !thursdayRx.skip && thursdayRx.type?.pelotonClass && (
          <>
            <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.85, marginLeft: 24 }}>
              Peloton {thursdayRx.type.pelotonClass} · {thursdayRx.type.pelotonInstructors.join(' / ')}
            </div>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.rust, marginLeft: 24, lineHeight: 1.4 }}>
              ⚠ {PELOTON_SYNC_WARNING}
            </div>
          </>
        )}

        {/* Weather line */}
        {tomorrowForecast && (
          <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.85, marginTop: 2 }}>
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
