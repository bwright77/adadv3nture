import { useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'

interface WDrinkEntryProps { dark?: boolean }

export function WDrinkEntry({ dark }: WDrinkEntryProps) {
  const [count, setCount] = useState(1)
  return (
    <Glass dark={dark} span={12} pad={16}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <CardLabel dark={dark}>Drinks today</CardLabel>
        <span className="mono" style={{ fontSize: 9, opacity: 0.55 }}>ratio · not streak</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <button
          onClick={() => setCount(c => Math.max(0, c - 1))}
          style={{
            width: 44, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
            background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,18,8,0.08)',
            color: dark ? C.cream : C.dark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 300,
          }}
        >−</button>
        <div className="mono" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1 }}>{count}</div>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{
            width: 44, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
            background: C.rust, color: C.cream,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 300,
          }}
        >+</button>
      </div>
      <div className="mono" style={{ fontSize: 10, textAlign: 'center', marginTop: 6, opacity: 0.6 }}>
        7d 0.8/d ↓ · 30d 1.4/d ↓ · ✓ on track
      </div>
    </Glass>
  )
}
