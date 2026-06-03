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
        {/* WA week ring — 5 segments, filled = a day WA moved */}
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {Array.from({ length: target }).map((_, i) => (
              <span key={i} style={{
                width: 18, height: 18, borderRadius: '50%',
                background: i < done ? C.rust : 'transparent',
                border: `2px solid ${i < done ? C.rust : (dark ? 'rgba(245,237,214,0.3)' : C.ink20)}`,
              }} />
            ))}
          </div>
          <div className="mono" style={{ fontSize: 'var(--fs-11)', color: dark ? 'rgba(245,237,214,0.6)' : C.ink60 }}>
            {done}/{target} this week · {done >= target ? 'lit' : 'keep moving'}
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
