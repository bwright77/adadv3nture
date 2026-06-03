import { useEffect, useState } from 'react'
import { Glass } from '../ui/Glass'
import { CardLabel } from '../ui/CardLabel'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { getSeasonHeatmap, type HeatWeek } from '../../lib/adventures'
import { SUMMER_START, SUMMER_END } from '../../hooks/useSummerMode'

interface Props { dark?: boolean }

function monthTick(weekStart: string): string {
  return new Date(weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })
}

// The season filling in — a memory artifact, never a streak. A faint cell = we
// got out that week; a star = a real adventure. A blank week is just blank.
export function SeasonHeatmap({ dark }: Props) {
  const { user } = useAuth()
  const [weeks, setWeeks] = useState<HeatWeek[]>([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getSeasonHeatmap(user.id, SUMMER_START, SUMMER_END)
      .then(w => { if (!cancelled) setWeeks(w) })
      .catch(() => null)
    return () => { cancelled = true }
  }, [user])

  const real = weeks.filter(w => w.isReal).length
  const out = weeks.filter(w => w.gotOut).length

  return (
    <Glass dark={dark} span={12} pad={14}>
      <CardLabel dark={dark}>The summer, week by week</CardLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
        {weeks.map((w, i) => {
          const prevMonth = i > 0 ? monthTick(weeks[i - 1].weekStart) : null
          const showTick = i === 0 || monthTick(w.weekStart) !== prevMonth
          return (
            <div key={w.weekStart} style={{ textAlign: 'center' }}>
              <div
                title={`Week of ${w.weekStart} · ${w.count} logged${w.isReal ? ' · real adventure ★' : ''}`}
                style={{
                  width: 22, height: 22, borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, lineHeight: 1,
                  background: w.isReal
                    ? C.rust
                    : w.gotOut ? 'rgba(196,82,42,0.28)' : 'transparent',
                  border: `1px solid ${w.gotOut ? C.rust : (dark ? 'rgba(245,237,214,0.18)' : C.ink20)}`,
                  color: '#fff',
                }}
              >
                {w.isReal ? '★' : ''}
              </div>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.4, marginTop: 2, height: 12, color: dark ? C.cream : C.dark }}>
                {showTick ? monthTick(w.weekStart) : ''}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mono" style={{ fontSize: 'var(--fs-11)', marginTop: 8, color: dark ? 'rgba(245,237,214,0.6)' : C.ink60 }}>
        {out} weeks out · {real} real adventures ★
      </div>
    </Glass>
  )
}
