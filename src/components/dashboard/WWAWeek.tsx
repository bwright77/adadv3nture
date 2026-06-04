import { useEffect, useState } from 'react'
import { Glass } from '../ui/Glass'
import { CardLabel } from '../ui/CardLabel'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { useAnchorEvent } from '../../hooks/useAnchorEvent'
import { daysUntil } from '../../lib/countdown'
import { getWAWeekProgress, type WAWeekProgress } from '../../lib/daily-plan'

interface Props { dark?: boolean }

// Summer watcher (a): Wright Adventures progress, target 5×/week. The ring is
// derived from career_done (no new schema); paired with the Labor Day countdown.
// Runs independent of summerMode through Labor Day — a career surface, not seasonal.
export function WWAWeek({ dark }: Props) {
  const { user } = useAuth()
  const [wa, setWa] = useState<WAWeekProgress | null>(null)
  const event = useAnchorEvent('labor_day')
  const days = daysUntil(event.event_date)
  const isPast = days < 0
  const weeks = days >= 0 ? Math.floor(days / 7) : 0
  const remainder = days >= 0 ? days % 7 : 0
  const urgentColor = isPast ? C.ink40 : days < 60 ? C.rust : days < 90 ? C.sand : undefined

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getWAWeekProgress(user.id)
      .then(p => { if (!cancelled) setWa(p) })
      .catch(() => null)
    return () => { cancelled = true }
  }, [user])

  const done = wa?.done ?? 0
  const target = wa?.target ?? 5

  return (
    <Glass dark={dark} span={12} pad={14}>
      <CardLabel dark={dark}>Wright Adventures · this week</CardLabel>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        {/* WA week progress — a single bar that fills with the week's momentum,
            with faint ticks marking the 5× target. Reads as progress, not as
            empty/dead slots. */}
        <div style={{ flex: 1, minWidth: 0, maxWidth: 220 }}>
          <div style={{
            position: 'relative', height: 10, borderRadius: 5,
            background: dark ? 'rgba(245,237,214,0.14)' : 'rgba(26,18,8,0.08)',
            overflow: 'hidden', marginBottom: 6,
          }}>
            {/* Filled momentum */}
            <div style={{
              position: 'absolute', inset: 0, width: `${Math.min(1, done / target) * 100}%`,
              background: `linear-gradient(90deg, ${C.rust}, ${C.rust}cc)`,
              borderRadius: 5, transition: 'width 0.4s ease',
            }} />
            {/* Target ticks */}
            {Array.from({ length: target - 1 }).map((_, i) => (
              <span key={i} style={{
                position: 'absolute', top: 0, bottom: 0, left: `${((i + 1) / target) * 100}%`,
                width: 1, background: dark ? 'rgba(26,18,8,0.35)' : 'rgba(255,255,255,0.7)',
              }} />
            ))}
          </div>
          <div className="mono" style={{ fontSize: 'var(--fs-11)', color: dark ? 'rgba(245,237,214,0.6)' : C.ink60 }}>
            {done} of {target} this week · {done >= target ? 'lit' : 'keep moving'}
          </div>
        </div>

        {/* Labor Day countdown */}
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 'var(--fs-22)', fontWeight: 700, lineHeight: 1, color: urgentColor ?? (dark ? C.cream : C.dark) }}>
            {isPast ? '—' : <>{weeks}<span style={{ fontSize: 'var(--fs-12)', opacity: 0.5 }}>wk</span> <span style={{ fontSize: 'var(--fs-13)', opacity: 0.45 }}>{remainder}d</span></>}
          </div>
          <div className="badge" style={{ fontSize: 'var(--fs-10)', marginTop: 2, color: urgentColor ?? (dark ? 'rgba(245,237,214,0.6)' : C.ink60) }}>
            to Labor Day
          </div>
        </div>
      </div>
    </Glass>
  )
}
