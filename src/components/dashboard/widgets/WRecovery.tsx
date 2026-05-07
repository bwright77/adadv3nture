import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { Ring } from '../../ui/Ring'
import { C } from '../../../tokens'

interface WRecoveryProps { dark?: boolean }

export function WRecovery({ dark }: WRecoveryProps) {
  return (
    <Glass dark={dark} span={5} pad={14}>
      <CardLabel dark={dark}>Recovery</CardLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <Ring pct={82} color={C.teal} label="82" dark={dark} size={54} />
        <div>
          <div className="badge" style={{ fontSize: 13, color: C.teal }}>GO HARD</div>
          <div className="mono" style={{ fontSize: 9.5, opacity: 0.6, marginTop: 2 }}>RHR 61 · sleep 84</div>
          <div className="mono" style={{ fontSize: 9.5, opacity: 0.6 }}>conf · high</div>
        </div>
      </div>
    </Glass>
  )
}
