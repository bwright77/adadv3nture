import { Glass } from '../../ui/Glass'
import { C } from '../../../tokens'
import type { InspirationPhoto } from '../../../hooks/useInspiration'

interface WInspireProps {
  dark?: boolean
  photo: InspirationPhoto | null
  onExpand?: () => void
}

export function WInspire({ dark, photo, onExpand }: WInspireProps) {
  const yearsAgo = photo ? new Date().getFullYear() - photo.year : 0

  return (
    <Glass dark={dark} span={6} pad={0} style={{ height: 130, padding: 0, cursor: onExpand ? 'pointer' : undefined }}
      onClick={photo ? onExpand : undefined}
    >
      {photo ? (
        <>
          <div style={{ position: 'absolute', inset: 0, background: `url(${photo.path}) center/cover`, borderRadius: 22 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7))', borderRadius: 22 }} />
          <div style={{ position: 'absolute', left: 12, top: 10 }}>
            <span className="badge" style={{
              fontSize: 9, color: C.cream, letterSpacing: '0.2em',
              background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: 4,
            }}>
              ON THIS DAY
            </span>
          </div>
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, color: C.cream }}>
            <div className="badge" style={{ fontSize: 13, lineHeight: 1.1 }}>
              {photo.takenAt}
            </div>
            <div className="mono" style={{ fontSize: 10, opacity: 0.85 }}>
              {photo.year} · {yearsAgo}y ago
            </div>
          </div>
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="badge" style={{ fontSize: 9, opacity: 0.4, letterSpacing: '0.15em' }}>
            ON THIS DAY
          </span>
        </div>
      )}
    </Glass>
  )
}
