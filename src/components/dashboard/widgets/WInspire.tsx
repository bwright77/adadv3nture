import { Glass } from '../../ui/Glass'
import { C } from '../../../tokens'

interface WInspireProps {
  dark?: boolean
  photo: string
  year: string
  place: string
  onExpand?: () => void
}

export function WInspire({ dark, photo, year, place, onExpand }: WInspireProps) {
  return (
    <Glass dark={dark} span={6} pad={0} style={{ height: 130, padding: 0, cursor: onExpand ? 'pointer' : undefined }}
      onClick={onExpand}
    >
      <div style={{ position: 'absolute', inset: 0, background: `url(${photo}) center/cover` }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7))' }} />
      <div style={{ position: 'absolute', left: 12, top: 10 }}>
        <span className="badge" style={{
          fontSize: 9, color: C.cream, letterSpacing: '0.2em',
          background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: 4,
        }}>
          ON THIS DAY
        </span>
      </div>
      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, color: C.cream }}>
        <div className="badge" style={{ fontSize: 13, lineHeight: 1.1 }}>{place}</div>
        <div className="mono" style={{ fontSize: 10, opacity: 0.85 }}>
          {year} · {2026 - parseInt(year, 10)}y ago
        </div>
      </div>
    </Glass>
  )
}
