import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { Spark } from '../../ui/Spark'
import { C } from '../../../tokens'

interface WDrinksProps { dark?: boolean }

export function WDrinks({ dark }: WDrinksProps) {
  return (
    <Glass dark={dark} span={4} pad={14}>
      <CardLabel dark={dark}>Drinks · 7d</CardLabel>
      <div className="mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
        0.8<span style={{ fontSize: 11, opacity: 0.5 }}>/d</span>
      </div>
      <div className="mono" style={{ fontSize: 9.5, opacity: 0.55, marginTop: 2 }}>goal ≤ 2.0 ✓</div>
      <div style={{ marginTop: 8 }}>
        <Spark data={[2, 3, 1, 1, 0, 2, 0, 1, 0, 1]} color={C.teal} w={80} h={20} fill />
      </div>
    </Glass>
  )
}
