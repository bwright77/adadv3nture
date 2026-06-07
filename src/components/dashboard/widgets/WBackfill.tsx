import { useEffect, useState, useCallback } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getOpenDays } from '../../../lib/daily-plan'
import { formatFullDate } from '../../../lib/utils'
import { WReview } from './WReview'

interface Props { dark?: boolean }

function chipLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

// "Completeness, not enforcement." Surfaces past days that went unlogged (no
// mood) as an invitation to fill — "you forgot Friday, here's Friday" — across
// however many days you were off-grid. Never a gate; quiet when caught up.
export function WBackfill({ dark }: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) return
    const days = await getOpenDays(user.id)
    setOpen(days)
    setLoaded(true)
    // NOTE: do NOT clear `selected` here. Logging mood removes the day from the
    // open list, but the user is mid-fill — keep the form open so they can enter
    // every category for that day. The form closes only on manual deselect.
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  // Quiet when there's nothing to fill — but keep the widget mounted while a
  // day is actively being filled (even after it leaves the open list).
  if (!loaded || (open.length === 0 && !selected)) return null

  // Keep the in-progress day's chip visible even once it's been given a mood.
  const chipDays = selected && !open.includes(selected) ? [selected, ...open] : open

  return (
    <Glass dark={dark} span={12} pad={16}>
      <CardLabel dark={dark}>
        {open.length > 0
          ? `Catch up · ${open.length} ${open.length === 1 ? 'day' : 'days'} unlogged`
          : 'Catch up · filling in'}
      </CardLabel>
      <div style={{ fontSize: 'var(--fs-13)', color: dark ? 'rgba(245,237,214,0.7)' : C.ink60, lineHeight: 1.45, marginBottom: 10 }}>
        No rush — tap a day to fill it in. Log mood and any category; the form
        stays open until you tap the day again. Any synced run, weight or sleep
        already there stays put.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {chipDays.map(d => {
          const on = selected === d
          return (
            <button key={d} onClick={() => setSelected(on ? null : d)} style={{
              padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 'var(--fs-12)',
              background: on ? C.rust : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(26,18,8,0.05)'),
              border: `1px solid ${on ? C.rust : (dark ? 'rgba(255,255,255,0.15)' : C.ink20)}`,
              color: on ? '#fff' : (dark ? C.cream : C.dark),
            }}>
              {chipLabel(d)}
            </button>
          )
        })}
      </div>

      {selected && (
        <div style={{ marginTop: 12 }}>
          <WReview
            dark={dark}
            forDate={selected}
            labelOverride={`Filling ${formatFullDate(selected)}`}
            onSaved={refresh}
          />
        </div>
      )}
    </Glass>
  )
}
