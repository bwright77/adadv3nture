import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'

interface WLaborDayProps { dark?: boolean }

function daysUntil(target: Date): number {
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000)
}

export function WLaborDay({ dark }: WLaborDayProps) {
  const days = daysUntil(new Date('2026-09-01'))
  const weeks = Math.floor(days / 7)
  const urgentColor = days < 60 ? C.rust : days < 90 ? C.sand : undefined

  return (
    <Glass dark={dark} span={6} pad={14}>
      <CardLabel dark={dark}>Labor day · Sept 1</CardLabel>
      <div className="mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, fontFeatureSettings: '"zero" 0', color: urgentColor }}>
        {weeks}<span style={{ fontSize: 11, opacity: 0.5 }}>wk</span>
        <span style={{ fontSize: 13, opacity: 0.45, marginLeft: 4 }}>{days}d</span>
      </div>
      <div className="badge" style={{ fontSize: 10, marginTop: 4, color: urgentColor ?? (dark ? C.cream : C.dark) }}>
        WA income or get a job
      </div>
      <div className="mono" style={{ fontSize: 9.5, color: C.rust, marginTop: 5 }}>● PFB call pending → Jenn</div>
    </Glass>
  )
}
