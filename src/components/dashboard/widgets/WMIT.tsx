import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'

interface WMITProps { dark?: boolean }

export function WMIT({ dark }: WMITProps) {
  return (
    <Glass dark={dark} span={4} pad={14}>
      <CardLabel dark={dark}>MIT · today</CardLabel>
      <div className="mono" style={{ fontSize: 'var(--fs-26)', fontWeight: 700, lineHeight: 1, fontFeatureSettings: '"zero" 0' }}>
        73<span style={{ fontSize: 'var(--fs-14)', opacity: 0.5 }}>%</span>
      </div>
      <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.55, marginTop: 2 }}>↑12 vs last wk</div>
      <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
        {[1, 1, 1, 0, 1].map((v, i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: 2,
            background: v ? C.rust : (dark ? 'rgba(255,255,255,0.18)' : 'rgba(26,18,8,0.12)'),
          }} />
        ))}
      </div>
    </Glass>
  )
}
