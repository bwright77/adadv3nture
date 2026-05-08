import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'

interface WLaborDayProps { dark?: boolean }

function daysUntil(target: Date): number {
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000)
}

export function WLaborDay({ dark }: WLaborDayProps) {
  const days = daysUntil(new Date('2026-09-01'))
  return (
    <Glass dark={dark} span={6} pad={14}>
      <CardLabel dark={dark}>Labor day · countdown</CardLabel>
      <div className="mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, fontFeatureSettings: '"zero" 0' }}>
        {days}<span style={{ fontSize: 11, opacity: 0.5 }}>d</span>
      </div>
      <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>WA income or job · fish-or-cut-bait</div>
      <div className="mono" style={{ fontSize: 9.5, color: C.rust, marginTop: 6 }}>● PFB call pending → Jenn</div>
    </Glass>
  )
}
