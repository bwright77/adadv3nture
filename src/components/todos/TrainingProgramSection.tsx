import { useEffect, useMemo, useState } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getAllTrainingWeeks, type TrainingWeek, type TrainingPhase } from '../../lib/training'
import { isBikeActivity } from '../../lib/trends'
import { daysUntil } from '../../lib/countdown'
import { useAnchorEvent } from '../../hooks/useAnchorEvent'
import { logicalToday } from '../../lib/utils'

const PHASE_LABEL: Record<TrainingPhase, string> = {
  base: 'BASE', build: 'BUILD', peak: 'PEAK', taper: 'TAPER',
}

// System-token mapping: aerobic foundation → teal, intensity ramp → sand,
// peak demand → rust, wind-down → dark teal.
const PHASE_COLOR: Record<TrainingPhase, string> = {
  base: C.teal, build: C.sand, peak: C.rust, taper: C.tealDk,
}

const PHASE_DESC: Record<TrainingPhase, string> = {
  base:  'Build aerobic foundation. Run volume ramps from 24→32 mpw. Long run to 12 miles. Cycling volume builds toward FOCO. Vert work begins by W3.',
  build: 'Peak aerobic load. FOCO Fondo (W9) and Ride the Hurricane (W11) as cycling anchors. Run volume maintained 25–32 mpw around events. W12 cycling exits — trail running becomes sole focus.',
  peak:  'Highest run quality. W13 long run (14 mi / 1,500+ ft) is the Bergen simulator. W14: Bergen Peak (13.1 mi / 2,451 ft / 9,708 ft summit) — race at controlled effort. Target finish 2:45. Bergen is your single best WLW predictor.',
  taper: 'Bergen recovery then one final hard week (W16). Volume drops progressively into WLW. Target finish: 4:30–4:45. Sub-4:30 on the table if Bergen goes under 2:40.',
}

const PRINCIPLES: [string, string][] = [
  ['Down weeks matter', 'W4, W10, W15 are not optional. Skipping recovery weeks is where injuries come from. Bergen at 13.1 mi / 2,451 ft makes W15 especially critical.'],
  ['Bergen is a predictor, not just a tune-up', '13.1 mi / 2,451 ft / 9,708 ft summit. Your 2016 result was 3:08 unstructured. Target 2:45 in 2026. Watch your mile 7–8 pace at the summit — that split predicts your WLW back half.'],
  ['Vert is non-negotiable', 'Green Mtn → Mount Falcon → Lookout Mtn → Herman Gulch → Bergen Peak. WLW has 4,200 ft. Flat miles don\'t prepare you for any of it.'],
  ['Cycling doesn\'t transfer here', 'FOCO and Hurricane build aerobic base, not trail legs. Once both events are done, cycling drops to zero permanently.'],
  ['The W13 run is your Bergen simulator', '14 miles / 1,500+ ft the week before Bergen. If that feels controlled, race Bergen at 2:40–2:45. If it\'s a suffer-fest, back off to 2:50–3:00.'],
  ['Trust the taper, trust the data', 'WLW target: 4:30–4:45. Sub-4:30 on the table if Bergen goes under 2:40 and W16 long run feels strong. The math is grounded in your actual 2016 result, not pace calculators.'],
]

interface Activity {
  activity_date: string
  activity_type: string
  title: string | null
  distance_miles: number | null
  duration_seconds: number | null
}

interface WeekActuals {
  run: number
  long_run: number
  bike: number
  strength: number
}

function weekEndDate(weekStart: string): string {
  const d = new Date(weekStart + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().substring(0, 10)
}

function formatWeekRange(weekStart: string): string {
  const d = new Date(weekStart + 'T12:00:00')
  const end = new Date(d)
  end.setDate(d.getDate() + 6)
  const fmt = (x: Date) => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(d)} – ${fmt(end)}`
}

function computeActuals(weekStart: string, activities: Activity[]): WeekActuals {
  const endStr = weekEndDate(weekStart)
  const inWeek = activities.filter(a => a.activity_date >= weekStart && a.activity_date <= endStr)
  const runs = inWeek.filter(a => a.activity_type === 'run' || a.activity_type === 'trail_run')
  const rides = inWeek.filter(a => isBikeActivity(a.activity_type))
  const strengthDates = new Set(
    inWeek
      .filter(a => (a.title?.toLowerCase().includes('strength') ?? false) && (a.duration_seconds ?? 0) > 600)
      .map(a => a.activity_date),
  )
  return {
    run: runs.reduce((s, a) => s + (a.distance_miles ?? 0), 0),
    long_run: runs.length > 0 ? Math.max(...runs.map(r => r.distance_miles ?? 0)) : 0,
    bike: rides.reduce((s, a) => s + (a.distance_miles ?? 0), 0),
    strength: strengthDates.size,
  }
}

function paceColor(pct: number): string {
  if (pct >= 90) return C.teal
  if (pct >= 70) return C.sand
  return C.rust
}

// Round to 1 decimal — display only.
const r1 = (n: number) => Math.round(n * 10) / 10

export function TrainingProgramSection() {
  const { user } = useAuth()
  const [weeks, setWeeks] = useState<TrainingWeek[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [phaseFilter, setPhaseFilter] = useState<TrainingPhase | null>(null)
  const wlw = useAnchorEvent('wlw')
  const wlwDays = daysUntil(wlw.event_date)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    getAllTrainingWeeks(user.id).then(async w => {
      if (cancelled || w.length === 0) {
        if (!cancelled) { setWeeks([]); setLoading(false) }
        return
      }
      const planStart = w[0].week_start
      const planEnd = weekEndDate(w[w.length - 1].week_start)
      const { data } = await supabase
        .from('activities')
        .select('activity_date, activity_type, title, distance_miles, duration_seconds')
        .eq('user_id', user.id)
        .gte('activity_date', planStart)
        .lte('activity_date', planEnd)
      if (cancelled) return
      setWeeks(w)
      setActivities((data ?? []) as Activity[])
      setLoading(false)
    }).catch(() => {
      if (!cancelled) { setWeeks([]); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [user])

  // Derived state ---------------------------------------------------------
  const today = logicalToday()
  const currentIdx = useMemo(() => {
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (weeks[i].week_start <= today) return i
    }
    return -1
  }, [weeks, today])

  const actualsByIdx = useMemo(
    () => weeks.map(w => computeActuals(w.week_start, activities)),
    [weeks, activities],
  )

  // Cumulative target/actual across all weeks up to and including the current.
  const cumulative = useMemo(() => {
    const upto = currentIdx >= 0 ? currentIdx : -1
    const acc = { run: 0, long_run: 0, bike: 0, strength: 0 }
    const tgt = { run: 0, long_run: 0, bike: 0, strength: 0 }
    for (let i = 0; i <= upto; i++) {
      acc.run      += actualsByIdx[i].run
      acc.bike     += actualsByIdx[i].bike
      acc.strength += actualsByIdx[i].strength
      acc.long_run = Math.max(acc.long_run, actualsByIdx[i].long_run)
      tgt.run      += weeks[i].target_run_miles ?? 0
      tgt.bike     += weeks[i].target_cycling_miles ?? 0
      tgt.strength += weeks[i].target_strength_sessions ?? 0
      tgt.long_run = Math.max(tgt.long_run, weeks[i].target_long_run_miles ?? 0)
    }
    return { acc, tgt }
  }, [weeks, actualsByIdx, currentIdx])

  if (loading) {
    return <div style={{ gridColumn: 'span 12', padding: '20px 0', color: C.ink40, fontSize: 'var(--fs-13)', textAlign: 'center' }}>Loading training program…</div>
  }
  if (weeks.length === 0) return null

  const currentWeek = currentIdx >= 0 ? weeks[currentIdx] : null
  const currentPhase = currentWeek?.phase_id ?? 'base'
  const currentActuals = currentIdx >= 0 ? actualsByIdx[currentIdx] : { run: 0, long_run: 0, bike: 0, strength: 0 }
  const overallPct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / weeks.length) * 100) : 0
  const filtered = phaseFilter ? weeks.filter(w => w.phase_id === phaseFilter) : weeks
  const maxRun = Math.max(...weeks.map(w => w.target_run_miles ?? 0), 1)

  return (
    <div style={{ gridColumn: 'span 12' }}>
      {/* Section header */}
      <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40, marginBottom: 10, marginTop: 20 }}>
        ◆ TRAINING PROGRAM
      </div>

      {/* Position card */}
      <div style={{ background: '#fff', borderRadius: 14, border: `0.5px solid ${C.ink20}`, padding: '14px 16px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <div>
            <div className="badge" style={{ fontSize: 'var(--fs-17)', color: C.dark, lineHeight: 1.1 }}>
              West Line Winder 30K
            </div>
            <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40, letterSpacing: '0.12em', marginTop: 4 }}>
              {currentWeek ? `W${currentIdx + 1} of ${weeks.length} · ${PHASE_LABEL[currentPhase]}` : `${weeks.length}-WEEK PLAN`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 'var(--fs-20)', fontWeight: 700, color: C.dark, lineHeight: 1 }}>
              {wlwDays >= 0 ? wlwDays : '—'}
              <span style={{ fontSize: 'var(--fs-12)', opacity: 0.5, marginLeft: 4 }}>d</span>
            </div>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em', marginTop: 2 }}>
              TO WLW
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: C.ink20, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${overallPct}%`, height: '100%', background: PHASE_COLOR[currentPhase] }} />
        </div>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em', marginTop: 6 }}>
          {overallPct}% COMPLETE
        </div>
      </div>

      {/* Report card — this week + cumulative season */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 8,
        marginBottom: 10,
      }}>
        <MetricTile
          label="RUN"
          thisWk={currentActuals.run}
          thisTgt={currentWeek?.target_run_miles ?? 0}
          cumActual={cumulative.acc.run}
          cumTarget={cumulative.tgt.run}
          unit="mi"
        />
        <MetricTile
          label="LONG"
          thisWk={currentActuals.long_run}
          thisTgt={currentWeek?.target_long_run_miles ?? 0}
          cumActual={cumulative.acc.long_run}
          cumTarget={cumulative.tgt.long_run}
          unit="mi"
          peak
        />
        <MetricTile
          label="BIKE"
          thisWk={currentActuals.bike}
          thisTgt={currentWeek?.target_cycling_miles ?? 0}
          cumActual={cumulative.acc.bike}
          cumTarget={cumulative.tgt.bike}
          unit="mi"
        />
        <MetricTile
          label="STR"
          thisWk={currentActuals.strength}
          thisTgt={currentWeek?.target_strength_sessions ?? 0}
          cumActual={cumulative.acc.strength}
          cumTarget={cumulative.tgt.strength}
          unit="×"
        />
      </div>

      {/* Phase pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <PhaseChip
          active={phaseFilter === null}
          color={C.dark}
          onClick={() => setPhaseFilter(null)}
          label="ALL"
          sub={`W1–${weeks.length}`}
        />
        {(['base', 'build', 'peak', 'taper'] as const).map(p => {
          const ws = weeks.filter(w => w.phase_id === p)
          if (ws.length === 0) return null
          const first = weeks.findIndex(w => w.phase_id === p) + 1
          const last = first + ws.length - 1
          return (
            <PhaseChip
              key={p}
              active={phaseFilter === p}
              color={PHASE_COLOR[p]}
              onClick={() => setPhaseFilter(phaseFilter === p ? null : p)}
              label={PHASE_LABEL[p]}
              sub={`W${first}–${last}`}
            />
          )
        })}
      </div>

      {phaseFilter && (
        <div style={{
          padding: '10px 12px',
          background: '#fff',
          borderLeft: `3px solid ${PHASE_COLOR[phaseFilter]}`,
          borderRadius: 8,
          marginBottom: 10,
          fontSize: 'var(--fs-12)',
          color: C.ink60,
          lineHeight: 1.5,
        }}>
          {PHASE_DESC[phaseFilter]}
        </div>
      )}

      {/* Volume chart — always all 19 for context, current stroked, future faded */}
      <div style={{ background: '#fff', borderRadius: 12, border: `0.5px solid ${C.ink20}`, padding: '12px 14px', marginBottom: 10 }}>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.15em', marginBottom: 8 }}>
          WEEKLY RUN VOLUME
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 56 }}>
          {weeks.map((w, i) => {
            const phase = (w.phase_id ?? 'base') as TrainingPhase
            const color = PHASE_COLOR[phase]
            const h = ((w.target_run_miles ?? 0) / maxRun) * 52
            const isCurrent = i === currentIdx
            const isFuture = i > currentIdx
            return (
              <div key={w.id} title={`W${i + 1}: ${w.target_run_miles}mi · ${w.phase_label}`}
                style={{
                  flex: 1, height: Math.max(h, 2),
                  background: color,
                  opacity: isFuture ? 0.4 : 1,
                  borderTop: isCurrent ? `2px solid ${C.dark}` : 'none',
                  borderRadius: 1,
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Week list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        {filtered.map((w, i) => {
          const idx = weeks.indexOf(w)
          const phase = (w.phase_id ?? 'base') as TrainingPhase
          const color = PHASE_COLOR[phase]
          const isCurrent = idx === currentIdx
          const isPast = idx < currentIdx
          const prev = filtered[i - 1]
          const showPhaseHeader = !prev || prev.phase_id !== w.phase_id
          const a = actualsByIdx[idx]
          return (
            <div key={w.id}>
              {showPhaseHeader && (
                <div className="mono" style={{
                  fontSize: 'var(--fs-10)', letterSpacing: '0.2em',
                  color, padding: '12px 0 6px',
                  borderTop: i > 0 ? `0.5px solid ${C.ink20}` : 'none',
                  marginTop: i > 0 ? 4 : 0,
                }}>
                  ── {PHASE_LABEL[phase]}
                </div>
              )}
              <WeekRow
                week={w}
                index={idx + 1}
                color={color}
                isCurrent={isCurrent}
                showActuals={isPast || isCurrent}
                actuals={a}
              />
            </div>
          )
        })}
      </div>

      {/* Principles */}
      <div style={{ background: '#fff', borderRadius: 12, border: `0.5px solid ${C.ink20}`, padding: '14px 16px' }}>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.2em', marginBottom: 10 }}>
          GOVERNING PRINCIPLES
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PRINCIPLES.map(([title, body]) => (
            <div key={title}>
              <div className="badge" style={{ fontSize: 'var(--fs-12)', color: C.dark, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 'var(--fs-11)', color: C.ink60, lineHeight: 1.5 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Subcomponents ──────────────────────────────────────────────────────

function MetricTile({ label, thisWk, thisTgt, cumActual, cumTarget, unit, peak = false }: {
  label: string
  thisWk: number
  thisTgt: number
  cumActual: number
  cumTarget: number
  unit: string
  peak?: boolean   // long-run peak is "max so far" rather than "sum"
}) {
  const thisPct = thisTgt > 0 ? Math.round((thisWk / thisTgt) * 100) : (thisWk > 0 ? 100 : 0)
  const cumPct = cumTarget > 0 ? Math.round((cumActual / cumTarget) * 100) : 0
  const fmt = (n: number) => unit === '×' ? String(Math.round(n)) : r1(n).toString()
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: `0.5px solid ${C.ink20}`, padding: '10px 12px' }}>
      <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.15em', marginBottom: 6 }}>
        {label}
      </div>
      {/* This week */}
      <div style={{ marginBottom: 6 }}>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.08em' }}>THIS WK</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span className="mono" style={{ fontSize: 'var(--fs-15)', fontWeight: 700, color: paceColor(thisPct) }}>
            {fmt(thisWk)}
          </span>
          <span className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40 }}>
            / {fmt(thisTgt)}{unit === '×' ? '×' : ''}
          </span>
        </div>
      </div>
      {/* Season cumulative */}
      <div>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.08em' }}>
          {peak ? 'SEASON PEAK' : 'SEASON'}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span className="mono" style={{ fontSize: 'var(--fs-15)', fontWeight: 700, color: paceColor(cumPct) }}>
            {fmt(cumActual)}
          </span>
          <span className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40 }}>
            / {fmt(cumTarget)}{unit === '×' ? '×' : ''}
          </span>
          {cumTarget > 0 && (
            <span className="mono" style={{ fontSize: 'var(--fs-10)', color: paceColor(cumPct), marginLeft: 'auto' }}>
              {cumPct}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function PhaseChip({ active, color, label, sub, onClick }: {
  active: boolean; color: string; label: string; sub: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color : '#fff',
        color: active ? C.cream : C.ink60,
        border: `1px solid ${active ? color : C.ink20}`,
        borderRadius: 999,
        padding: '4px 10px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <span className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.14em', fontWeight: 700 }}>
        {label}
      </span>
      <span className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.7 }}>
        {sub}
      </span>
    </button>
  )
}

function WeekRow({ week, index, color, isCurrent, showActuals, actuals }: {
  week: TrainingWeek
  index: number
  color: string
  isCurrent: boolean
  showActuals: boolean
  actuals: WeekActuals
}) {
  return (
    <div style={{
      background: isCurrent ? `${color}15` : '#fff',
      borderRadius: 10,
      border: `0.5px solid ${C.ink20}`,
      borderLeft: week.key_marker || isCurrent ? `3px solid ${color}` : `0.5px solid ${C.ink20}`,
      padding: '10px 12px',
      position: 'relative',
    }}>
      {isCurrent && (
        <div className="mono" style={{
          position: 'absolute', top: 8, right: 10,
          fontSize: 'var(--fs-10)', letterSpacing: '0.15em',
          color: C.cream, background: color,
          padding: '2px 8px', borderRadius: 999,
        }}>
          THIS WEEK
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span className="mono" style={{ fontSize: 'var(--fs-11)', color: week.key_marker ? color : C.ink40, letterSpacing: '0.1em', fontWeight: 700 }}>
          W{String(index).padStart(2, '0')}
        </span>
        <span className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40 }}>
          {formatWeekRange(week.week_start)}
        </span>
      </div>
      {week.key_marker && (
        <div className="mono" style={{ fontSize: 'var(--fs-11)', color, letterSpacing: '0.05em', marginBottom: 4 }}>
          {week.key_marker}
        </div>
      )}
      {week.focus && (
        <div style={{ fontSize: 'var(--fs-12)', color: C.dark, lineHeight: 1.4, marginBottom: 3 }}>
          {week.focus}
        </div>
      )}
      {week.notes && (
        <div style={{ fontSize: 'var(--fs-11)', color: C.ink60, lineHeight: 1.5, marginBottom: 8 }}>
          {week.notes}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <WeekMetric label="RUN"  target={week.target_run_miles}        actual={showActuals ? actuals.run      : null} unit="mi" />
        <WeekMetric label="LONG" target={week.target_long_run_miles}   actual={showActuals ? actuals.long_run : null} unit="mi" />
        <WeekMetric label="BIKE" target={week.target_cycling_miles}    actual={showActuals ? actuals.bike     : null} unit="mi" />
        <WeekMetric label="STR"  target={week.target_strength_sessions} actual={showActuals ? actuals.strength : null} unit="×"  />
      </div>
    </div>
  )
}

function WeekMetric({ label, target, actual, unit }: {
  label: string
  target: number | null
  actual: number | null
  unit: string
}) {
  const t = target ?? 0
  if (t === 0 && (actual ?? 0) === 0) {
    return (
      <div style={{ minWidth: 40 }}>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em' }}>{label}</div>
        <div className="mono" style={{ fontSize: 'var(--fs-12)', color: C.ink40, fontWeight: 600 }}>—</div>
      </div>
    )
  }
  const fmt = (n: number) => unit === '×' ? String(Math.round(n)) : r1(n).toString()
  let actualColor = C.ink40
  if (actual !== null) {
    const pct = t > 0 ? (actual / t) * 100 : (actual > 0 ? 100 : 0)
    actualColor = paceColor(pct)
  }
  return (
    <div style={{ minWidth: 56 }}>
      <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span className="mono" style={{ fontSize: 'var(--fs-12)', color: C.dark, fontWeight: 600 }}>
          {fmt(t)}{unit === '×' ? '×' : unit}
        </span>
        {actual !== null && (
          <span className="mono" style={{ fontSize: 'var(--fs-11)', color: actualColor }}>
            · {fmt(actual)}
          </span>
        )}
      </div>
    </div>
  )
}
