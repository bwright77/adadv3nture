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
  const subtitle = [photo?.location, photo?.activity_type].filter(Boolean).join(' · ')

  return (
    <Glass
      dark={dark}
      span={6}
      pad={0}
      style={{ height: 148, padding: 0, cursor: onExpand && photo ? 'pointer' : undefined }}
      onClick={photo ? onExpand : undefined}
    >
      {photo ? (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: `url(${photo.thumbnail_url}) center/cover`,
            borderRadius: 22,
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.72))',
            borderRadius: 22,
          }} />
          <div style={{ position: 'absolute', left: 12, top: 10 }}>
            <span className="badge" style={{
              fontSize: 10, color: C.cream, letterSpacing: '0.18em',
              background: 'rgba(0,0,0,0.38)', padding: '3px 8px', borderRadius: 4,
            }}>
              ON THIS DAY
            </span>
          </div>
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, color: C.cream }}>
            {photo.caption && (
              <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.3, marginBottom: 3 }}>
                "{photo.caption}"
              </div>
            )}
            <div className="badge" style={{ fontSize: 14, lineHeight: 1.1 }}>
              {subtitle || photo.takenAt}
            </div>
            <div className="mono" style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
              {photo.year}{yearsAgo > 0 ? ` · ${yearsAgo}y ago` : ''}
            </div>
          </div>
        </>
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span className="badge" style={{ fontSize: 10, opacity: 0.3, letterSpacing: '0.15em' }}>
            ON THIS DAY
          </span>
          <span style={{ fontSize: 12, opacity: 0.25 }}>
            run: npm run sync-photos
          </span>
        </div>
      )}
    </Glass>
  )
}
