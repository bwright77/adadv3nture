import { useEffect, useMemo, useState } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import {
  getAllTrainingWeeks,
  type TrainingWeek,
  type TrainingPhase,
} from '../../lib/training'
import { daysUntil } from '../../lib/countdown'
import { useAnchorEvent } from '../../hooks/useAnchorEvent'

interface TrainingPlanViewProps {
  onClose: () => void
}

const PHASE_LABEL: Record<TrainingPhase, string> = {
  base:  'BASE',
  build: 'BUILD',
  peak:  'PEAK',
  taper: 'TAPER',
}

// System-token mapping: aerobic foundation → teal, intensity ramp → sand,
// peak demand → rust (matches the alert/peak convention elsewhere), wind-down
// → dark teal (calm + cool). Kept distinct enough that the phase pills and
// bar chart segments read cleanly side-by-side.
const PHASE_COLOR: Record<TrainingPhase, string> = {
  base:  C.teal,
  build: C.sand,
  peak:  C.rust,
  taper: C.tealDk,
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

function formatWeekRange(weekStart: string): string {
  const d = new Date(weekStart + 'T12:00:00')
  const end = new Date(d)
  end.setDate(d.getDate() + 6)
  const fmt = (x: Date) => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(d)} – ${fmt(end)}`
}

function todayMonday(): string {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return monday.toISOString().substring(0, 10)
}

export function TrainingPlanView({ onClose }: TrainingPlanViewProps) {
  const { user } = useAuth()
  const [weeks, setWeeks] = useState<TrainingWeek[]>([])
  const [loading, setLoading] = useState(true)
  const [activePhase, setActivePhase] = useState<TrainingPhase | null>(null)
  const wlw = useAnchorEvent('wlw')
  const wlwDays = daysUntil(wlw.event_date)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getAllTrainingWeeks(user.id)
      .then(setWeeks)
      .catch(() => setWeeks([]))
      .finally(() => setLoading(false))
  }, [user])

  const filtered = useMemo(
    () => activePhase ? weeks.filter(w => w.phase_id === activePhase) : weeks,
    [weeks, activePhase],
  )
  const totalRun  = weeks.reduce((s, w) => s + (w.target_run_miles ?? 0), 0)
  const totalBike = weeks.reduce((s, w) => s + (w.target_cycling_miles ?? 0), 0)
  const peakLR    = weeks.reduce((m, w) => Math.max(m, w.target_long_run_miles ?? 0), 0)
  const eventCount = weeks.filter(w => w.key_marker).length
  const maxRun = weeks.reduce((m, w) => Math.max(m, w.target_run_miles ?? 0), 1)
  const monday = todayMonday()

  const stats: [string, string | number][] = [
    ['Total run', `${Math.round(totalRun)} mi`],
    ['Total ride', `${Math.round(totalBike)} mi`],
    ['Peak long run', `${peakLR} mi`],
    ['Key weeks', eventCount],
    ['Days to WLW', wlwDays >= 0 ? wlwDays : '—'],
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: C.paper, overflowY: 'auto',
      color: C.dark,
    }}>
      {/* Hero band */}
      <div style={{
        background: C.dark, color: C.cream,
        padding: 'calc(env(safe-area-inset-top, 0px) + 56px) 18px 24px',
        position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 16,
          background: 'rgba(245,237,214,0.15)', border: 'none', borderRadius: 20,
          padding: '5px 14px', color: C.cream, fontSize: 'var(--fs-13)', cursor: 'pointer',
          fontFamily: 'inherit',
        }}>← Back</button>

        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: 'rgba(245,237,214,0.55)', letterSpacing: '0.2em', marginBottom: 6 }}>
          TRAINING BLOCK · MAY–SEP 2026
        </div>
        <div className="badge" style={{ fontSize: 'var(--fs-26)', lineHeight: 1.1, marginBottom: 4 }}>
          West Line Winder 30K
        </div>
        <div className="mono" style={{ fontSize: 'var(--fs-12)', color: 'rgba(245,237,214,0.65)', marginBottom: 18 }}>
          19-week plan · {eventCount} key weeks · Sep 26, 2026
        </div>

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {stats.map(([label, val]) => (
            <div key={label}>
              <div className="badge" style={{ fontSize: 'var(--fs-20)', lineHeight: 1, color: C.cream }}>{val}</div>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.14em', color: 'rgba(245,237,214,0.55)', marginTop: 4 }}>
                {label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 18px 100px' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.ink40, fontSize: 'var(--fs-14)' }}>Loading plan…</div>
        ) : weeks.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.ink40, fontSize: 'var(--fs-14)' }}>No plan seeded.</div>
        ) : (
          <>
            {/* Phase pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              <PhaseChip
                active={activePhase === null}
                color={C.dark}
                onClick={() => setActivePhase(null)}
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
                    active={activePhase === p}
                    color={PHASE_COLOR[p]}
                    onClick={() => setActivePhase(activePhase === p ? null : p)}
                    label={PHASE_LABEL[p]}
                    sub={`W${first}–${last}`}
                  />
                )
              })}
            </div>

            {/* Phase description */}
            {activePhase && (
              <div style={{
                padding: '12px 14px',
                background: '#fff',
                borderLeft: `3px solid ${PHASE_COLOR[activePhase]}`,
                borderRadius: 8,
                marginBottom: 18,
                fontSize: 'var(--fs-13)',
                color: C.ink60,
                lineHeight: 1.55,
              }}>
                {PHASE_DESC[activePhase]}
              </div>
            )}

            {/* Run volume bar chart — always shows all 19 weeks for context */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 18, border: `0.5px solid ${C.ink20}` }}>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.15em', marginBottom: 10 }}>
                WEEKLY RUN VOLUME
              </div>
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 64 }}>
                {weeks.map((w, i) => {
                  const phase = w.phase_id ?? 'base'
                  const color = PHASE_COLOR[phase]
                  const h = ((w.target_run_miles ?? 0) / maxRun) * 60
                  const isKey = !!w.key_marker
                  const isCurrent = w.week_start === monday
                  return (
                    <div key={w.id} title={`W${i + 1}: ${w.target_run_miles}mi · ${w.phase_label}`}
                      style={{
                        flex: 1, height: Math.max(h, 2),
                        background: isKey ? color : `${color}88`,
                        borderTop: isCurrent ? `2px solid ${C.dark}` : 'none',
                        borderRadius: 1,
                      }}
                    />
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                {(['base', 'build', 'peak', 'taper'] as const).map(p => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, background: PHASE_COLOR[p], borderRadius: 1 }} />
                    <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em' }}>
                      {PHASE_LABEL[p]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Week list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map((w, i) => {
                const idx = weeks.indexOf(w) + 1
                const phase = w.phase_id ?? 'base'
                const color = PHASE_COLOR[phase]
                const isKey = !!w.key_marker
                const isCurrent = w.week_start === monday
                const prev = filtered[i - 1]
                const showPhaseHeader = !prev || prev.phase_id !== w.phase_id

                return (
                  <div key={w.id}>
                    {showPhaseHeader && (
                      <div className="mono" style={{
                        fontSize: 'var(--fs-10)', letterSpacing: '0.2em',
                        color, padding: '14px 0 6px',
                        borderTop: i > 0 ? `0.5px solid ${C.ink20}` : 'none',
                        marginTop: i > 0 ? 6 : 0,
                      }}>
                        ── {PHASE_LABEL[phase]}
                      </div>
                    )}
                    <WeekRow
                      week={w}
                      index={idx}
                      color={color}
                      isKey={isKey}
                      isCurrent={isCurrent}
                    />
                  </div>
                )
              })}
            </div>

            {/* Governing principles */}
            <div style={{
              marginTop: 24, padding: '18px 18px 22px',
              background: '#fff', borderRadius: 12, border: `0.5px solid ${C.ink20}`,
            }}>
              <div className="mono" style={{
                fontSize: 'var(--fs-10)', letterSpacing: '0.2em',
                color: C.ink40, marginBottom: 14,
              }}>
                GOVERNING PRINCIPLES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {PRINCIPLES.map(([title, body]) => (
                  <div key={title}>
                    <div className="badge" style={{ fontSize: 'var(--fs-13)', color: C.dark, marginBottom: 3 }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 'var(--fs-12)', color: C.ink60, lineHeight: 1.55 }}>
                      {body}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PhaseChip({ active, color, label, sub, onClick }: {
  active: boolean
  color: string
  label: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color : '#fff',
        color: active ? C.cream : C.ink60,
        border: `1px solid ${active ? color : C.ink20}`,
        borderRadius: 999,
        padding: '5px 12px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span className="mono" style={{ fontSize: 'var(--fs-11)', letterSpacing: '0.14em', fontWeight: 700 }}>
        {label}
      </span>
      <span className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.7 }}>
        {sub}
      </span>
    </button>
  )
}

function WeekRow({ week, index, color, isKey, isCurrent }: {
  week: TrainingWeek
  index: number
  color: string
  isKey: boolean
  isCurrent: boolean
}) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 10,
      border: `0.5px solid ${C.ink20}`,
      borderLeft: isKey ? `3px solid ${color}` : `0.5px solid ${C.ink20}`,
      padding: '12px 14px',
      position: 'relative',
    }}>
      {isCurrent && (
        <div className="mono" style={{
          position: 'absolute', top: 8, right: 12,
          fontSize: 'var(--fs-10)', letterSpacing: '0.15em',
          color: C.dark, background: C.cream,
          padding: '2px 8px', borderRadius: 999,
        }}>
          THIS WEEK
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span className="mono" style={{ fontSize: 'var(--fs-11)', color: isKey ? color : C.ink40, letterSpacing: '0.1em', fontWeight: 700 }}>
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
        <div style={{ fontSize: 'var(--fs-13)', color: C.dark, lineHeight: 1.4, marginBottom: 4 }}>
          {week.focus}
        </div>
      )}
      {week.notes && (
        <div style={{ fontSize: 'var(--fs-12)', color: C.ink60, lineHeight: 1.5, marginBottom: 8 }}>
          {week.notes}
        </div>
      )}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <MetricChip label="RUN"  value={week.target_run_miles}        unit="mi" emphasis={(week.target_run_miles ?? 0) >= 30 ? C.rust : (week.target_run_miles ?? 0) >= 25 ? C.sand : undefined} />
        <MetricChip label="LONG" value={week.target_long_run_miles}   unit="mi" />
        <MetricChip label="BIKE" value={week.target_cycling_miles}    unit="mi" emphasis={(week.target_cycling_miles ?? 0) >= 50 ? C.teal : undefined} />
        <MetricChip label="STR"  value={week.target_strength_sessions} unit="×"  />
      </div>
    </div>
  )
}

function MetricChip({ label, value, unit, emphasis }: {
  label: string
  value: number | null
  unit: string
  emphasis?: string
}) {
  const v = value ?? 0
  const display = v > 0 ? `${v}${unit}` : '—'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 38 }}>
      <span className="mono" style={{ fontSize: 'var(--fs-13)', color: emphasis ?? (v > 0 ? C.dark : C.ink40), fontWeight: 600 }}>
        {display}
      </span>
      <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em' }}>
        {label}
      </span>
    </div>
  )
}
