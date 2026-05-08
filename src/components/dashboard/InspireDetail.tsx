import { C } from '../../tokens'
import type { InspirationPhoto } from '../../hooks/useInspiration'

interface InspireDetailProps {
  photo: InspirationPhoto
  onClose: () => void
}

export function InspireDetail({ photo, onClose }: InspireDetailProps) {
  const yearsAgo = new Date().getFullYear() - photo.year
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: `url(${photo.original_url}) center/cover no-repeat`,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%)',
      }} />

      <div style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ padding: '56px 18px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: C.cream }}>
          <button onClick={onClose} style={{
            fontSize: 'var(--fs-22)', fontWeight: 300, background: 'none', border: 'none', cursor: 'pointer', color: C.cream,
          }}>×</button>
          <span className="badge" style={{ fontSize: 'var(--fs-12)', letterSpacing: '0.2em' }}>
            ON THIS DAY · {yearsAgo}Y AGO
          </span>
          <span style={{ fontSize: 'var(--fs-18)', opacity: 0.5 }}>↗</span>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 38, left: 0, right: 0, padding: '0 22px', color: C.cream, zIndex: 10 }}>
        <div className="badge" style={{ fontSize: 'var(--fs-24)', lineHeight: 1.05 }}>
          {photo.takenAt.toUpperCase()}
        </div>
        <div className="mono" style={{ fontSize: 'var(--fs-14)', opacity: 0.85, marginTop: 6 }}>
          {photo.year} · the adventure
        </div>
      </div>
    </div>
  )
}
