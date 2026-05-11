import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAnchorEvent } from '../../../hooks/useAnchorEvent'
import { daysUntilDate } from '../../../lib/anchorEvents'

interface WLaborDayProps { dark?: boolean }

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00')
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function WLaborDay({ dark }: WLaborDayProps) {
  const event = useAnchorEvent('labor_day')
  const days = daysUntilDate(event.event_date)
  const weeks = Math.floor(days / 7)
  const urgentColor = days < 60 ? C.rust : days < 90 ? C.sand : undefined

  return (
    <Glass dark={dark} span={6} pad={14}>
      <CardLabel dark={dark}>{event.title} · {formatShortDate(event.event_date)}</CardLabel>
      <div className="mono" style={{ fontSize: 'var(--fs-26)', fontWeight: 700, lineHeight: 1, fontFeatureSettings: '"zero" 0', color: urgentColor }}>
        {weeks}<span style={{ fontSize: 'var(--fs-13)', opacity: 0.5 }}>wk</span>
        <span style={{ fontSize: 'var(--fs-15)', opacity: 0.45, marginLeft: 4 }}>{days}d</span>
      </div>
      <div className="badge" style={{ fontSize: 'var(--fs-12)', marginTop: 4, color: urgentColor ?? (dark ? C.cream : C.dark) }}>
        Time to build.
      </div>
    </Glass>
  )
}
