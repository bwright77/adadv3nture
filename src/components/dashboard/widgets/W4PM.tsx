import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'

interface W4PMProps { dark?: boolean }

export function W4PM({ dark }: W4PMProps) {
  return (
    <Glass dark={dark} span={12} pad={16}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <CardLabel dark={dark}>4pm project · weather routed</CardLabel>
        <span className="mono" style={{ fontSize: 9, color: C.teal }}>SUNNY · 64°</span>
      </div>
      <div className="badge" style={{ fontSize: 17, marginTop: 2, lineHeight: 1.1 }}>
        FJ62 · DRAIN COOLANT<br />
        <span style={{ color: C.teal, fontSize: 13 }}>+ SYLVIA HELPS · GOOD TRUCK HELPER</span>
      </div>
      <div className="mono" style={{ display: 'flex', gap: 6, marginTop: 10, fontSize: 10 }}>
        <span style={{
          background: C.teal + '33', color: dark ? C.teal : C.tealDk,
          padding: '3px 8px', borderRadius: 4,
        }}>quick · 45m</span>
        <span style={{
          background: dark ? 'rgba(255,255,255,0.1)' : C.creamDk,
          padding: '3px 8px', borderRadius: 4,
        }}>dry weather</span>
      </div>
    </Glass>
  )
}
