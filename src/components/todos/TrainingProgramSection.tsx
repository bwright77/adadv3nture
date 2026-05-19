import { useEffect, useMemo, useState } from 'react'
import { C } from '../../tokens'
import { Ring } from '../ui/Ring'
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

// Hero gradient + shadow per phase — the WLW anchor card recolors to match
// where Ben is in the program. The 'to' stops are hand-picked darker variants
// of each phase color since tokens.ts only has tealDk and rustDk natively.
const PHASE_HERO: Record<TrainingPhase, { from: string; to: string; shadow: string }> = {
  base:  { from: '#5BBCB8', to: '#2F8783', shadow: 'rgba(91,188,184,0.3)' },
  build: { from: '#D4824A', to: '#A26033', shadow: 'rgba(212,130,74,0.3)' },
  peak:  { from: '#C4522A', to: '#8B3A1E', shadow: 'rgba(196,82,42,0.3)' },
  taper: { from: '#3B9D98', to: '#1F605D', shadow: 'rgba(47,135,131,0.3)' },
}

const PHASE_DESC: Record<TrainingPhase, string> = {
  base:  'Build aerobic foundation. Run volume ramps from 24→32 mpw. Long run to 12 miles. Cycling volume builds toward FOCO. Vert work begins by W3.',
  build: 'Peak aerobic load. FOCO Fondo (W9) and Ride the Hurricane (W11) as cycling anchors. Run volume maintained 25–32 mpw around events. W12 cycling exits — trail running becomes sole focus.',
  peak:  'Highest run quality. W13 long run (14 mi / 1,500+ ft) is the Bergen simulator. W14: Bergen Peak (13.1 mi / 2,451 ft / 9,708 ft summit) — race at controlled effort. Target finish 2:45. Bergen is your single best WLW predictor.',
  taper: 'Bergen recovery then one final hard week (W16). Volume drops progressively into WLW. Target finish: 4:30–4:45. Sub-4:30 on the table if Bergen goes under 2:40.',
}

const PRINCIPLES: [string, string][] = [
  ['Long runs are sacred — and trail-specific', "Distance, vert, and descent targets are non-negotiable. Route doesn't matter. Denver foothills or Howard/Salida — same targets, different scenery. Turkey Rock doubled + flat miles works fine."],
  ['Multi-sport midweek is the plan', 'Peloton intervals, gravel climbing, rower, MTB — all count. Rotating load vectors reduces overuse injury risk and lets you train at higher total stress than running alone allows. Best athlete wins, not best runner.'],
  ['Cycling climbing transfers', "Sustained bike climbing builds quads and glutes directly relevant to trail uphills. Gravel and MTB terrain builds meaningful proprioception too. What cycling can't replicate is eccentric downhill loading — that's what the trail long runs are for."],
  ['Bergen is a predictor, not just a tune-up', '13.1 mi / 2,451 ft / 9,708 ft summit. Target 2:45. Your 2016 result was 3:08 unstructured — this is the delta structured training buys. Watch mile 7–8 at the summit.'],
  ['Down weeks are not optional', "W4, W10, W15. Skipping them is where long training blocks unravel. Bergen's recovery (W15) is especially critical — 9,700 ft at race effort is a deeper hole than it looks."],
  ['Trust the taper, trust the data', 'WLW target: 4:30–4:45. Sub-4:30 on the table if Bergen goes under 2:40 and W16 long run feels controlled. The math is grounded in your actual 2016 result.'],
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
  // 'all' shows everything chronologically; a specific phase narrows the
  // week list. We auto-pick the current phase once weeks load (effect below)
  // so the user lands on the section they're actually in.
  const [phaseFilter, setPhaseFilter] = useState<TrainingPhase | 'all'>('all')
  const [autoPickedPhase, setAutoPickedPhase] = useState(false)
  const [showDone, setShowDone] = useState(false)
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

  // Land the user on their current phase once we know which one it is.
  useEffect(() => {
    if (autoPickedPhase || currentIdx < 0 || weeks.length === 0) return
    const phase = weeks[currentIdx].phase_id
    if (phase) setPhaseFilter(phase)
    setAutoPickedPhase(true)
  }, [currentIdx, weeks, autoPickedPhase])

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
  const filtered = phaseFilter === 'all' ? weeks : weeks.filter(w => w.phase_id === phaseFilter)
  const maxRun = Math.max(...weeks.map(w => w.target_run_miles ?? 0), 1)

  // Hero stats — show what's logged so far against the plan.
  const longestRunSoFar = currentIdx >= 0
    ? Math.max(0, ...actualsByIdx.slice(0, currentIdx + 1).map(a => a.long_run))
    : 0
  const weeksElapsed = Math.max(1, currentIdx + 1)
  const avgRunPerWeek = currentIdx >= 0
    ? actualsByIdx.slice(0, currentIdx + 1).reduce((s, a) => s + a.run, 0) / weeksElapsed
    : 0

  const hero = PHASE_HERO[currentPhase]

  return (
    <div style={{ gridColumn: 'span 12' }}>
      {/* Section header */}
      <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40, marginBottom: 10, marginTop: 20 }}>
        ◆ TRAINING PROGRAM
      </div>

      {/* Hero card — phase-colored gradient so at a glance you know where
          you are in the program. Pattern mirrors Hikes50View's hero. */}
      <div style={{
        marginBottom: 14, padding: 18, borderRadius: 18,
        background: `linear-gradient(135deg, ${hero.from} 0%, ${hero.to} 100%)`,
        color: C.cream, position: 'relative', overflow: 'hidden',
        boxShadow: `0 10px 30px ${hero.shadow}`,
      }}>
        {/* Mountain silhouette */}
        <svg viewBox="0 0 300 60" preserveAspectRatio="none" style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          width: '100%', height: 60, opacity: 0.22,
        }}>
          <path d="M0 60 L0 35 L40 18 L70 28 L110 8 L150 22 L190 12 L230 26 L270 14 L300 22 L300 60 Z" fill={C.cream} />
        </svg>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Ring pct={overallPct} color={C.cream} label={currentWeek ? String(currentIdx + 1) : '—'} size={72} sw={6} />
          <div style={{ flex: 1 }}>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.18em', opacity: 0.85 }}>
              {currentWeek ? `${PHASE_LABEL[currentPhase]} · W${currentIdx + 1} OF ${weeks.length}` : 'TRAINING PROGRAM'}
            </div>
            <div className="badge" style={{ fontSize: 'var(--fs-22)', lineHeight: 1, marginTop: 4, letterSpacing: '0.02em' }}>
              WEST LINE WINDER
            </div>
            <div className="badge" style={{ fontSize: 'var(--fs-13)', opacity: 0.85, marginTop: 1 }}>
              30K · BUENA VISTA · 9·26
            </div>
            <div className="mono" style={{ fontSize: 'var(--fs-11)', marginTop: 6, opacity: 0.85, lineHeight: 1.4 }}>
              {wlwDays >= 0 ? `${wlwDays}d to race` : 'race day'} · longest {longestRunSoFar.toFixed(1)}mi · avg {avgRunPerWeek.toFixed(1)}mi/wk
            </div>
          </div>
        </div>

        {/* Phase progress bar — segments sized by week-count per phase */}
        <div style={{ position: 'relative', marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            {(['base', 'build', 'peak', 'taper'] as const).map(p => (
              <div key={p} className="mono" style={{
                fontSize: 'var(--fs-10)',
                color: C.cream,
                opacity: p === currentPhase ? 1 : 0.45,
              }}>
                {PHASE_LABEL[p].toLowerCase()}
              </div>
            ))}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(245,237,214,0.2)', display: 'flex', overflow: 'hidden' }}>
            {(['base', 'build', 'peak', 'taper'] as const).map(p => {
              const ws = weeks.filter(w => w.phase_id === p)
              const width = (ws.length / weeks.length) * 100
              return (
                <div key={p} style={{
                  height: '100%',
                  width: `${width}%`,
                  background: p === currentPhase ? 'rgba(245,237,214,0.9)' : 'rgba(245,237,214,0.25)',
                }} />
              )
            })}
          </div>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', marginTop: 4, opacity: 0.55 }}>
            {overallPct}% complete
          </div>
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

      {/* Phase pills — default to current phase; ALL shows everything. */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        <PhaseChip
          active={phaseFilter === 'all'}
          color={C.dark}
          onClick={() => { setPhaseFilter('all'); setShowDone(false) }}
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
              onClick={() => { setPhaseFilter(p); setShowDone(false) }}
              label={PHASE_LABEL[p]}
              sub={`W${first}–${last}`}
            />
          )
        })}
      </div>

      {phaseFilter !== 'all' && (
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

      {/* Week list — current + upcoming visible, done weeks collapsed at the
          bottom (toggle), so the user always lands on what's ahead. Phase
          headers only render in ALL view since the pill already names the phase. */}
      {(() => {
        const upcoming = filtered.filter(w => weeks.indexOf(w) >= currentIdx || currentIdx < 0)
        const done = filtered.filter(w => weeks.indexOf(w) < currentIdx && currentIdx >= 0)
        return (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {upcoming.map((w, i) => {
                const idx = weeks.indexOf(w)
                const phase = (w.phase_id ?? 'base') as TrainingPhase
                const color = PHASE_COLOR[phase]
                const isCurrent = idx === currentIdx
                const prev = upcoming[i - 1]
                const showPhaseHeader = phaseFilter === 'all' && (!prev || prev.phase_id !== w.phase_id)
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
                      showActuals={isCurrent}
                      actuals={actualsByIdx[idx]}
                    />
                  </div>
                )
              })}
              {upcoming.length === 0 && (
                <div style={{ padding: '18px 12px', textAlign: 'center', color: C.ink40, fontSize: 'var(--fs-13)' }}>
                  No upcoming weeks in this phase.
                </div>
              )}
            </div>

            {done.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <button
                  onClick={() => setShowDone(v => !v)}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '8px 4px', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.2em', color: C.ink40 }}>
                    {showDone ? '▾' : '▸'} DONE · {done.length}
                  </span>
                  <span style={{ flex: 1, height: 1, background: C.ink20 }} />
                </button>
                {showDone && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, opacity: 0.85 }}>
                    {done.map(w => {
                      const idx = weeks.indexOf(w)
                      const phase = (w.phase_id ?? 'base') as TrainingPhase
                      return (
                        <WeekRow
                          key={w.id}
                          week={w}
                          index={idx + 1}
                          color={PHASE_COLOR[phase]}
                          isCurrent={false}
                          showActuals
                          actuals={actualsByIdx[idx]}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )
      })()}

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
  // Rest / recovery / down weeks get a softer phase-tinted highlight too —
  // not as strong as the current-week treatment, but visually distinct from
  // an ordinary week so down weeks aren't overlooked.
  const isRest = (week.key_marker ?? '').startsWith('🔽')
  const bg = isCurrent ? `${color}1F` : isRest ? `${color}10` : '#fff'
  const borderLeft = isCurrent || isRest || week.key_marker
    ? `3px solid ${color}`
    : `0.5px solid ${C.ink20}`
  return (
    <div style={{
      background: bg,
      borderRadius: 10,
      border: `0.5px solid ${C.ink20}`,
      borderLeft,
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
      {!isCurrent && isRest && (
        <div className="mono" style={{
          position: 'absolute', top: 8, right: 10,
          fontSize: 'var(--fs-10)', letterSpacing: '0.15em',
          color, opacity: 0.85,
        }}>
          REST
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
  // Explicit string type — C.ink40 is a literal token, paceColor returns a
  // wider string, so without this tsc -b complains in the Vercel build.
  let actualColor: string = C.ink40
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
