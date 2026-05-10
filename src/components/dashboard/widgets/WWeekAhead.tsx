import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getTodayEvents, type CalendarEvent } from '../../../lib/google-calendar'
import { getCurrentTrainingWeek, type TrainingWeek } from '../../../lib/training'

interface Props { dark?: boolean }

function formatTime(iso: string): string {
  if (!iso.includes('T')) return ''
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h < 12 ? 'am' : 'pm'
  const hour = h % 12 || 12
  return `${hour}${m > 0 ? `:${String(m).padStart(2, '0')}` : ''}${ampm}`
}

function nextMondayOffset(): number {
  // Called on Sunday evening — Monday is 1 day away
  const dow = new Date().getDay() // 0=Sun
  if (dow === 0) return 1
  if (dow === 6) return 2
  return 1
}

const URGENCY_ORDER: Record<string, number> = { fire: 0, deck: 1, rain: 2 }

function Divider({ dark }: { dark?: boolean }) {
  return (
    <div style={{
      height: 1, margin: '12px 0',
      background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(26,18,8,0.07)',
    }} />
  )
}

export function WWeekAhead({ dark }: Props) {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [trainingWeek, setTrainingWeek] = useState<TrainingWeek | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.allSettled([
      getTodayEvents(user.id, nextMondayOffset()),
      getCurrentTrainingWeek(user.id),
    ]).then(([eventsRes, weekRes]) => {
      setEvents(eventsRes.status === 'fulfilled' ? eventsRes.value : [])
      setTrainingWeek(weekRes.status === 'fulfilled' ? weekRes.value : null)
      setLoading(false)
    })
  }, [user])

  const subColor = dark ? 'rgba(245,237,214,0.55)' : C.ink60

  const mondayDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + nextMondayOffset())
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })()

  return (
    <Glass dark={dark} span={12} pad={16}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span style={{ width: 5, height: 5, background: C.rust, borderRadius: 1 }} />
        <span className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.14em', color: subColor }}>
          WEEK AHEAD
        </span>
      </div>

      {loading ? (
        <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.4 }}>Loading…</div>
      ) : (
        <>
          {/* ── Monday ── */}
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.1em', opacity: 0.4, marginBottom: 8 }}>
            MONDAY · {mondayDate}
          </div>

          {/* Run Club — always show */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 16 }}>🏃</span>
            <div>
              <span className="badge" style={{ fontSize: 'var(--fs-13)', color: dark ? C.cream : C.dark }}>
                Run Club
              </span>
              <span className="mono" style={{ fontSize: 'var(--fs-11)', color: C.teal, marginLeft: 8 }}>
                Wash Park · 6:30pm · SACRED
              </span>
            </div>
          </div>

          {/* Calendar events for Monday */}
          {events.filter(e => {
            const t = e.title.toLowerCase()
            return !t.includes('run club')
          }).map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <span className="mono" style={{ fontSize: 'var(--fs-11)', color: subColor, minWidth: 40, flexShrink: 0 }}>
                {e.allDay ? 'all day' : formatTime(e.start)}
              </span>
              <span className="badge" style={{ fontSize: 'var(--fs-13)', color: dark ? C.cream : C.dark }}>
                {e.title}
              </span>
            </div>
          ))}

          {/* Training targets */}
          {trainingWeek && (
            <>
              <Divider dark={dark} />
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.1em', opacity: 0.4, marginBottom: 8 }}>
                TRAINING TARGETS
              </div>
              <div className="mono" style={{ fontSize: 'var(--fs-12)', color: subColor, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {trainingWeek.target_run_miles && (
                  <span>🏃 {trainingWeek.target_run_miles}mi run</span>
                )}
                {trainingWeek.target_long_run_miles && (
                  <span>long {trainingWeek.target_long_run_miles}mi</span>
                )}
                {trainingWeek.target_cycling_miles && (
                  <span>🚴 {trainingWeek.target_cycling_miles}mi</span>
                )}
                {trainingWeek.target_strength_sessions && (
                  <span>🏋️ {trainingWeek.target_strength_sessions}× strength</span>
                )}
              </div>
              {trainingWeek.phase_label && (
                <div className="mono" style={{ fontSize: 'var(--fs-11)', color: subColor, opacity: 0.6, marginTop: 4 }}>
                  {trainingWeek.phase_label}
                </div>
              )}
            </>
          )}

          {/* Career priorities */}
          {todos.length > 0 && (
            <>
              <Divider dark={dark} />
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.1em', opacity: 0.4, marginBottom: 8 }}>
                CAREER PRIORITIES
              </div>
              {todos.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{URGENCY_ICON[t.urgency]}</span>
                  <span className="badge" style={{ fontSize: 'var(--fs-13)', color: dark ? C.cream : C.dark }}>
                    {t.title}
                  </span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </Glass>
  )
}
