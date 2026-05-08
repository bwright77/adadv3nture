import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'

interface WKidsProps { dark?: boolean }

const KIDS = [
  { n: 'Chase',  a: '8.5', note: 'hoops' },
  { n: 'Ada',    a: '7',   note: 'ninja' },
  { n: 'Sylvia', a: '5',   note: 'truck' },
]

export function WKids({ dark }: WKidsProps) {
  return (
    <Glass dark={dark} span={12} pad={14}>
      <CardLabel dark={dark}>Kids home · 3:45</CardLabel>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        {KIDS.map(k => (
          <div key={k.n} style={{
            flex: 1, padding: 8, borderRadius: 12,
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(26,18,8,0.04)',
          }}>
            <div className="badge" style={{ fontSize: 13 }}>{k.n}</div>
            <div className="mono" style={{ fontSize: 11, opacity: 0.55 }}>{k.a}y · {k.note}</div>
          </div>
        ))}
      </div>
    </Glass>
  )
}
