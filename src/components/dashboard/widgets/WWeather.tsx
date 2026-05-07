import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'

interface WWeatherProps { dark?: boolean }

export function WWeather({ dark }: WWeatherProps) {
  return (
    <Glass dark={dark} span={4} pad={14}>
      <CardLabel dark={dark}>Denver · 5,318ft</CardLabel>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="mono" style={{ fontSize: 26, fontWeight: 700 }}>54°</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>↑68 ↓41</span>
      </div>
      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Clear · light wind</div>
      <div className="mono" style={{ fontSize: 9.5, marginTop: 6, color: C.teal }}>4pm window: dry ✓</div>
    </Glass>
  )
}
