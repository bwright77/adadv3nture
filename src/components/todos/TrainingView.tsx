import { useState, useEffect } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { getTrainingGoals, getCurrentTrainingWeek, type TrainingGoal, type TrainingWeek } from '../../lib/training'

const EVENT_COLOR: Record<string, string> = {
  trail_run:      C.rust,
  cycling_gravel: C.teal,
  cycling_road:   '#5B8FBF',
}

const EVENT_LABEL: Record<string, string> = {
  trail_run:      'TRAIL RUN',
  cycling_gravel: 'GRAVEL',
  cycling_road:   'ROAD CYCLING',
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function EventCard({ goal }: { goal: TrainingGoal }) {
  const days = daysUntil(goal.event_date)
  const color = EVENT_COLOR[goal.event_type] ?? C.rust
  const done = days < 0

  return (
    <div style={{
      position: 'relative', marginBottom: 10,
      opacity: done ? 0.45 : 1,
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: goal.is_anchor ? 5 : 4,
        background: goal.is_anchor ? `linear-gradient(180deg, ${color}, ${color}99)` : color,
        borderRadius: '4px 0 0 4px',
        boxShadow: goal.is_anchor ? `2px 0 10px ${color}44` : 'none',
      }} />
      <div style={{
        marginLeft: 4,
        background: goal.is_anchor ? `${color}08` : '#fff',
        border: goal.is_anchor ? `0.5px solid ${color}30` : `0.5px solid ${C.ink20}`,
        borderLeft: 'none', borderRadius: '0 14px 14px 0',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span className="mono" style={{ fontSize: 'var(--fs-10)', color, letterSpacing: '0.12em', fontWeight: 700 }}>
                {EVENT_LABEL[goal.event_type]}
              </span>
              {goal.is_anchor && (
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.rust, letterSpacing: '0.1em' }}>◆ ANCHOR</span>
              )}
            </div>
            <div style={{ fontSize: 'var(--fs-17)', fontWeight: 600, color: C.dark, lineHeight: 1.2, marginBottom: 4 }}>
              {goal.event_name}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {goal.location && (
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60 }}>{goal.location.toUpperCase()}</span>
              )}
              {goal.distance_label && (
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60 }}>{goal.distance_label.toUpperCase()}</span>
              )}
              {goal.elevation_label && (
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60 }}>{goal.elevation_label.toUpperCase()} ELEV</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {done ? (
              <div className="badge" style={{ fontSize: 'var(--fs-13)', color: C.teal }}>DONE</div>
            ) : (
              <>
                <div className="badge" style={{ fontSize: 'var(--fs-26)', lineHeight: 1, color: goal.is_anchor ? color : C.dark }}>{days}</div>
                <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em' }}>DAYS</div>
                <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, marginTop: 2 }}>{formatDate(goal.event_date)}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function WeekCard({ week }: { week: TrainingWeek }) {
  const items: { label: string; target: number | null; actual: number | null; unit: string }[] = [
    { label: 'RUN',      target: week.target_run_miles,        actual: week.actual_run_miles,         unit: 'MI' },
    { label: 'LONG RUN', target: week.target_long_run_miles,   actual: null,                          unit: 'MI' },
    { label: 'CYCLING',  target: week.target_cycling_miles,    actual: week.actual_cycling_miles,     unit: 'MI' },
    { label: 'STRENGTH', target: week.target_strength_sessions,actual: week.actual_strength_sessions, unit: 'X' },
  ].filter(i => (i.target ?? 0) > 0)

  return (
    <div style={{
      background: '#fff', border: `0.5px solid ${C.ink20}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em' }}>THIS WEEK</div>
          <div className="badge" style={{ fontSize: 'var(--fs-16)', color: C.dark, letterSpacing: '0.04em' }}>{week.phase_label}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 8 }}>
        {items.map(item => {
          const pct = item.actual != null && item.target ? Math.min(100, (item.actual / item.target) * 100) : null
          return (
            <div key={item.label} style={{
              background: C.paper, borderRadius: 10, padding: '8px 10px', textAlign: 'center',
            }}>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em', marginBottom: 4 }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                <span className="badge" style={{ fontSize: 'var(--fs-20)', lineHeight: 1, color: C.dark }}>{item.target}</span>
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40 }}>{item.unit}</span>
              </div>
              {pct !== null && (
                <div style={{ height: 3, background: C.ink20, borderRadius: 2, marginTop: 6 }}>
                  <div style={{ height: 3, width: `${pct}%`, background: C.teal, borderRadius: 2 }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TrainingView() {
  const { user } = useAuth()
  const [goals, setGoals] = useState<TrainingGoal[]>([])
  const [week, setWeek] = useState<TrainingWeek | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      getTrainingGoals(user.id),
      getCurrentTrainingWeek(user.id),
    ]).then(([g, w]) => {
      setGoals(g)
      setWeek(w)
    }).catch(() => null).finally(() => setLoading(false))
  }, [user])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: C.ink40, fontSize: 'var(--fs-15)' }}>Loading…</div>
  }

  return (
    <div style={{ padding: '0 0 140px' }}>
      {week && <WeekCard week={week} />}

      <div className="mono" style={{
        fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em',
        color: C.ink40, marginBottom: 10, marginTop: week ? 20 : 0,
      }}>
        ◆ TARGET EVENTS
      </div>

      {goals.map(g => <EventCard key={g.id} goal={g} />)}

      {goals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.ink40, fontSize: 'var(--fs-15)' }}>
          No training events set.
        </div>
      )}
    </div>
  )
}
