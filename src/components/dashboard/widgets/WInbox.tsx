import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'

interface WInboxProps { dark?: boolean }

export function WInbox({ dark }: WInboxProps) {
  return (
    <Glass dark={dark} span={6} pad={14}>
      <CardLabel dark={dark}>Inbox · captured</CardLabel>
      <div className="mono" style={{ fontSize: 'var(--fs-26)', fontWeight: 700, lineHeight: 1, fontFeatureSettings: '"zero" 0' }}>14</div>
      <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.55, marginTop: 2 }}>3 from last night</div>
      <div style={{ marginTop: 8, fontSize: 'var(--fs-12)', opacity: 0.7, fontStyle: 'italic', lineHeight: 1.4 }}>
        "FJ62 fan clutch · order before Howard"
      </div>
    </Glass>
  )
}
