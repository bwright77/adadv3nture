import { useEffect, useMemo, useState } from 'react'
import { C } from '../../tokens'
import { Ring } from '../ui/Ring'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getAllTrainingWeeks, type TrainingWeek, type TrainingPhase } from '../../lib/training'
import { WEEKLY_TEMPLATES } from '../../lib/training-templates'
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
  base:  'Build aerobic foundation. Run 18–28 mpw, long run to 12 miles. Quality starts W1 (PZ Max + strides); cruise miles add W3. Cycling volume builds toward FOCO. FTP retest closes Phase 1.',
  build: 'Peak aerobic load. FOCO Fondo (W9) is the cycling anchor; Ride the Hurricane (W11) is a bonus. Run maintained around events. W12: cycling exits, trail running primary. Heat rule active: run before 8AM or at altitude.',
  peak:  'Highest run quality. W13 long run (14mi / 1,500+ ft) is the Bergen simulator. W14: Bergen Peak (13.1mi / 2,451ft / 9,708ft summit) — race controlled. Target 2:45. Bergen is the single best WLW predictor.',
  taper: 'Bergen recovery then one final hard week (W16, 13mi with vert). Volume drops 30% → 55% into WLW. Target finish 4:30–4:45. Sub-4:30 on the table if Bergen goes under 2:40.',
}

// ─── Reference content (v3 plan) ────────────────────────────────────────
// WEEKLY_TEMPLATES moved to src/lib/training-templates.ts so WTomorrow can
// reuse the same day-of-week schedule for its swap-aware recommendations.

const QUALITY_STREAMS: { group: string; rows: { name: string; dose: string; when: string }[] }[] = [
  {
    group: 'CYCLING (Peloton Bike)',
    rows: [
      { name: 'Power Zone Max',  dose: '30–45 min, Z4–Z5 intervals',           when: '1×/wk W1–W13 · primary midweek quality' },
      { name: 'Climb Ride (alt)', dose: '30–45 min sustained Z3–Z4',            when: 'Substitute for PZ Max' },
      { name: 'PZ Endurance',    dose: '45–60 min Z2',                          when: '1–2×/wk all phases · heat alternative' },
      { name: 'FTP retest',      dose: '20-min FTP test',                       when: 'End of W6 (Jun 28) · gates Phase 2 zones' },
    ],
  },
  {
    group: 'RUNNING (flat-ground, no drive)',
    rows: [
      { name: 'Strides',         dose: '4–6 × 20s @ 5K effort, full walk rec',  when: '2×/wk all phases · neuromuscular' },
      { name: 'Cruise miles',    dose: '3–4 × 1mi @ Z3, 60–90s jog rec',        when: 'Bi-weekly W3–W13 · Cherry Creek / Wash Park' },
      { name: 'Progression run', dose: '45–60 min, last 15–20 @ Z3',            when: 'Alt with cruise miles W7–W13' },
      { name: 'Fartlek',         dose: '1–3 min hard / 1–3 min easy × 6–10',    when: 'Alt option · fits any neighborhood' },
      { name: 'Tempo (Z3)',      dose: '20–30 min continuous',                  when: '1×/wk Phase 2–3 high-quality weeks' },
    ],
  },
]

const STRENGTH_PHASES: { range: string; program: string; freq: string; goal: string }[] = [
  { range: 'W1–3',    program: 'Total Strength (Speer) — finish cycle', freq: '3×',          goal: 'Reactivation → progressive overload' },
  { range: 'W4',      program: 'Down week — bodyweight + light DB',     freq: '2×',          goal: 'Recovery' },
  { range: 'W5–8',    program: 'RK 5-Day Split (pick 3 of 5)',          freq: '3×',          goal: 'Unilateral / posterior chain · trail-specific' },
  { range: 'W9',      program: 'Maintenance — 1 lower body early week', freq: '1×',          goal: "Don't go into FOCO sore" },
  { range: 'W10–12',  program: 'RK Split continued',                    freq: '2–3×',        goal: 'Room for strength as cycling drops' },
  { range: 'W13–14',  program: 'Maintenance — 1 set per movement',      freq: '2× / 1× race',goal: 'Preserve, don\'t fatigue' },
  { range: 'W15–16',  program: 'Maintenance, light loading',            freq: '2×',          goal: 'Stay in the groove' },
  { range: 'W17–19',  program: 'Minimum effective dose',                freq: '1×',          goal: 'Stay loose, no soreness' },
]

const TRAIL_ROUTES: { name: string; distance: string; elevation: string; base: string; notes: string }[] = [
  { name: 'Turkey Rock (BLM, Howard)',         distance: '3.57mi base',        elevation: '361 ft',          base: '~6,600 ft', notes: 'Known route. Easily extended or doubled.' },
  { name: 'Turret Trail (Browns Canyon)',      distance: '6.9mi out-and-back', elevation: '1,085 ft',        base: '~6,800 ft', notes: 'Ruby Mountain trailhead, ~15 min north of Howard.' },
  { name: 'Catkin Gulch Loop (Browns Canyon)', distance: '11.5mi',             elevation: '~1,000 ft',       base: '~6,800 ft', notes: 'Deep monument run. No water. Rattlesnakes May–Sep.' },
  { name: 'Salida Mountain Trails (Tenderfoot)', distance: 'Flexible 6–14mi', elevation: '7,000–8,500 ft',  base: '~7,000 ft', notes: 'Stacked loop system, Burmac trailhead, 15 min from Howard.' },
  { name: 'Snow Mountain Ranch (Granby)',      distance: 'Flexible',           elevation: 'varies',          base: '~8,700 ft', notes: 'Waterfall + Nordic + 9-Mile Mtn. Pace 30–45 sec/mi slower at altitude.' },
]

const PRINCIPLES: [string, string][] = [
  ['Long runs are sacred and trail-specific', 'Vert and descent targets non-negotiable. Route flexible — Howard, Snow Mountain Ranch, Denver foothills all interchangeable.'],
  ['Multi-sport midweek is the plan', 'Peloton Bike + Row, gravel, MTB all count. Best athlete wins, not best runner.'],
  ['Quality is small but constant', 'PZ Max + strides from W1 onward. Volume alone doesn\'t make you faster.'],
  ['Hill stimulus comes from the Peloton and weekend long runs', "Midweek running is flat ground (Denver has no good in-town hills without a drive). Eccentric downhill loading lives on Saturdays — the bike can't replicate it."],
  ['Easy miles are the dosage variable', 'Protect long runs, quality, and strength. Cut easy when systemic load runs high.'],
  ['Bergen is a predictor', 'Mile 7–8 at the summit is the key split. Run it controlled, read the data.'],
  ['Down weeks are not optional', "W4, W10, W15. Bergen recovery (W15) especially deep — 13.1mi at 9,700ft is a deeper hole than it looks."],
  ['Strength supports running', "Don't compete with it. Maintenance only in Peak and Taper. 2 real sessions beats 3 planned and missed."],
  ['Body composition follows training load', "Fuel the work. Protein 150–160g/day. Alcohol ≤2/day. Don't chase lbs — chase pace, vert, and finish times."],
  ['Heat rule (Jul/Aug)', 'Run before 8AM or above 7,000 ft. Otherwise indoor Peloton or rower.'],
  ['Trust the taper', 'W18–19 will feel wrong. That restless feeling is legs loading up.'],
  ['Run Club Monday is sacred', 'Never override. The plan flexes around it, not the other way.'],
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
  const [showQuality, setShowQuality] = useState(false)
  const [showStrength, setShowStrength] = useState(false)
  const [showTrails, setShowTrails] = useState(false)
  const [showPrinciples, setShowPrinciples] = useState(false)
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

      {/* Weekly day-of-week template for the active phase (current phase
          when ALL is selected). Always visible — this is the "what does
          a normal week in this block look like" view. */}
      <WeeklyTemplate phase={phaseFilter === 'all' ? currentPhase : phaseFilter} />

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

      {/* Reference cards — collapsed by default. Plan content the user dips
          into when planning rather than scanning every load. */}
      <CollapsibleCard title="QUALITY STREAMS" open={showQuality} onToggle={() => setShowQuality(v => !v)}>
        <QualityStreamsCard />
      </CollapsibleCard>
      <CollapsibleCard title="STRENGTH PROGRESSION" open={showStrength} onToggle={() => setShowStrength(v => !v)}>
        <StrengthProgressionCard />
      </CollapsibleCard>
      <CollapsibleCard title="TRAIL ROTATION" open={showTrails} onToggle={() => setShowTrails(v => !v)}>
        <TrailRotationCard />
      </CollapsibleCard>

      {/* Principles — collapsed by default to match the other reference cards. */}
      <CollapsibleCard title="GOVERNING PRINCIPLES" open={showPrinciples} onToggle={() => setShowPrinciples(v => !v)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
          {PRINCIPLES.map(([title, body]) => (
            <div key={title}>
              <div className="badge" style={{ fontSize: 'var(--fs-12)', color: C.dark, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 'var(--fs-11)', color: C.ink60, lineHeight: 1.5 }}>{body}</div>
            </div>
          ))}
        </div>
      </CollapsibleCard>
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
        <div style={{ fontSize: 'var(--fs-11)', color: C.ink60, lineHeight: 1.5, marginBottom: 6 }}>
          {week.notes}
        </div>
      )}

      {/* Quality + Strength prescriptions — small distinct rows so PZ Max / strides
          / cruise miles render alongside the volume targets without crowding focus. */}
      {(week.quality_prescription || week.strength_prescription) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
          {week.quality_prescription && (
            <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60, letterSpacing: '0.05em' }}>
              <span style={{ color: C.ink40 }}>QUALITY ·</span> {week.quality_prescription}
            </div>
          )}
          {week.strength_prescription && (
            <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60, letterSpacing: '0.05em' }}>
              <span style={{ color: C.ink40 }}>STRENGTH ·</span> {week.strength_prescription}
            </div>
          )}
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

// ─── Weekly day-of-week template for the current phase ────────────────────

function WeeklyTemplate({ phase }: { phase: TrainingPhase }) {
  const days = WEEKLY_TEMPLATES[phase]
  const color = PHASE_COLOR[phase]
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `0.5px solid ${C.ink20}`, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.15em' }}>
          WEEKLY TEMPLATE
        </div>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color, letterSpacing: '0.15em' }}>
          {PHASE_LABEL[phase]}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {days.map(d => (
          <div key={d.day} style={{ display: 'grid', gridTemplateColumns: '38px 1fr', gap: 10, alignItems: 'baseline' }}>
            <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40, letterSpacing: '0.1em', fontWeight: 700 }}>
              {d.day.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-12)', color: C.dark, lineHeight: 1.35 }}>
                {d.primary}
              </div>
              {d.sub && (
                <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60, lineHeight: 1.4 }}>
                  {d.sub}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Collapsible reference card wrapper ───────────────────────────────────

function CollapsibleCard({ title, open, onToggle, children }: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `0.5px solid ${C.ink20}`, marginBottom: 10, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '12px 14px', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.15em' }}>
          {open ? '▾' : '▸'} {title}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: `0.5px solid ${C.ink20}` }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Quality streams reference ────────────────────────────────────────────

function QualityStreamsCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 12 }}>
      {QUALITY_STREAMS.map(group => (
        <div key={group.group}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.15em', marginBottom: 6 }}>
            {group.group}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.rows.map(r => (
              <div key={r.name} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ fontSize: 'var(--fs-12)', color: C.dark, fontWeight: 600 }}>{r.name}</div>
                <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60, lineHeight: 1.4 }}>
                  {r.dose}
                </div>
                <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, lineHeight: 1.4 }}>
                  {r.when}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Strength program progression ─────────────────────────────────────────

function StrengthProgressionCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12 }}>
      {STRENGTH_PHASES.map(p => (
        <div key={p.range} style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 10, alignItems: 'baseline' }}>
          <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40, letterSpacing: '0.1em', fontWeight: 700 }}>
            {p.range}
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-12)', color: C.dark }}>
              <span style={{ fontWeight: 600 }}>{p.program}</span>
              <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, marginLeft: 6 }}>{p.freq}</span>
            </div>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60, lineHeight: 1.4 }}>
              {p.goal}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Trail rotation reference ─────────────────────────────────────────────

function TrailRotationCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
      {TRAIL_ROUTES.map(r => (
        <div key={r.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <div style={{ fontSize: 'var(--fs-12)', color: C.dark, fontWeight: 600 }}>{r.name}</div>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60, whiteSpace: 'nowrap' }}>
              {r.distance} · {r.elevation}
            </div>
          </div>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, lineHeight: 1.4 }}>
            base {r.base} · {r.notes}
          </div>
        </div>
      ))}
      <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, lineHeight: 1.5, marginTop: 4, paddingTop: 10, borderTop: `0.5px solid ${C.ink20}` }}>
        Altitude exposure ladder: Howard (~6,600) → Catkin (~6,800) → SMR (~8,700) → Bergen summit (9,708) → WLW.
      </div>
    </div>
  )
}
