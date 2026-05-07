import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'

interface WReviewProps { dark?: boolean }

const ROWS = [
  { l: 'BODY',     v: '45m strength · ✓' },
  { l: 'CAREER',   v: 'replied Jenn · drafted GSEMA · ✓' },
  { l: 'FAMILY',   v: 'FJ62 w/ Sylvia · ✓' },
  { l: 'HOME',     v: '—' },
  { l: 'PERSONAL', v: '—' },
]

export function WReview({ dark }: WReviewProps) {
  return (
    <Glass dark={dark} span={12} pad={16}>
      <CardLabel dark={dark}>Day review · tap each</CardLabel>
      {ROWS.map((r, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', padding: '8px 0',
          borderBottom: i < ROWS.length - 1
            ? `0.5px dashed ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(26,18,8,0.12)'}`
            : 'none',
        }}>
          <span className="badge" style={{
            fontSize: 11,
            color: r.v === '—'
              ? (dark ? 'rgba(245,237,214,0.4)' : C.ink40)
              : (dark ? C.cream : C.dark),
          }}>
            {r.l}
          </span>
          <span className="mono" style={{ fontSize: 10, opacity: 0.75 }}>{r.v}</span>
        </div>
      ))}
    </Glass>
  )
}
