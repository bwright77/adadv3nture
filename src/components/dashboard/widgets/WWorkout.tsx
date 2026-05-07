import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'

interface WWorkoutProps { dark?: boolean }

export function WWorkout({ dark }: WWorkoutProps) {
  return (
    <Glass dark={dark} span={7} pad={14}>
      <CardLabel dark={dark}>Today · prescribed</CardLabel>
      <div className="badge" style={{ fontSize: 19, lineHeight: 1.05, marginTop: 2 }}>
        TOTAL STRENGTH<br />
        <span style={{ color: C.teal }}>W1 · D2 · CHEST</span>
      </div>
      <div className="mono" style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11 }}>
        <span>45 min</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>Z2 cap</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>indoor</span>
      </div>
      <div style={{ marginTop: 10, height: 3, background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,18,8,0.08)', borderRadius: 2 }}>
        <div style={{ width: '12%', height: '100%', background: C.rust, borderRadius: 2 }} />
      </div>
      <div className="mono" style={{ fontSize: 9, marginTop: 4, opacity: 0.6 }}>1 of 8 sessions · week 1</div>
    </Glass>
  )
}
