import { Glass } from '../../ui/Glass'
import { C } from '../../../tokens'
import { useAnchorEvent } from '../../../hooks/useAnchorEvent'
import { daysUntilDate } from '../../../lib/anchorEvents'

interface WEventProps { dark?: boolean }

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function WEvent({ dark }: WEventProps) {
  const wlw = useAnchorEvent('wlw')
  const days = daysUntilDate(wlw.event_date)
  const subParts = [
    formatShortDate(wlw.event_date),
    wlw.location,
    wlw.notes,
  ].filter(Boolean)

  return (
    <Glass dark={dark} span={12} pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 4, height: 36, background: C.rust, borderRadius: 2 }} />
      <div style={{ flex: 1 }}>
        <div className="badge" style={{ fontSize: 'var(--fs-14)' }}>{wlw.title.toUpperCase()}</div>
        <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.6 }}>
          {subParts.join(' · ')}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 'var(--fs-18)', fontWeight: 700, lineHeight: 1 }}>
          {days}<span style={{ fontSize: 'var(--fs-12)', opacity: 0.5 }}>d</span>
        </div>
        <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.teal }}>register now ↗</div>
      </div>
    </Glass>
  )
}
