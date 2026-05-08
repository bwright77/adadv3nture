import { C } from '../../tokens'
import type { InspirationPhoto } from '../../hooks/useInspiration'

interface InspireDetailProps {
  photo: InspirationPhoto
  onClose: () => void
}

export function InspireDetail({ photo, onClose }: InspireDetailProps) {
  const yearsAgo = new Date().getFullYear() - photo.year
  const subtitle = [photo.location, photo.activity_type].filter(Boolean).join(' · ')
  const takenDate = photo.takenAt
  const monthDay = takenDate.slice(0, 5).replace('-', '·')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: `url(${photo.original_url}) center/cover no-repeat`,
    }}>
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.4) 68%, rgba(26,18,8,0.95) 100%)',
      }} />

      {/* Film border */}
      <div style={{
        position: 'absolute', inset: 8,
        border: '1px solid rgba(245,237,214,0.18)',
        borderRadius: 38,
        pointerEvents: 'none', zIndex: 5,
      }} />

      {/* Corner crop marks */}
      {(['tl', 'tr', 'bl', 'br'] as const).map(k => {
        const pos: Record<string, number | string> = {}
        if (k.includes('t')) pos.top = 18; else pos.bottom = 82
        if (k.includes('l')) pos.left = 18; else pos.right = 18
        const style: React.CSSProperties = {
          position: 'absolute', width: 14, height: 14, zIndex: 11,
          ...pos,
          borderTop: k.includes('t') ? '1.5px solid rgba(245,237,214,0.5)' : undefined,
          borderBottom: k.includes('b') ? '1.5px solid rgba(245,237,214,0.5)' : undefined,
          borderLeft: k.includes('l') ? '1.5px solid rgba(245,237,214,0.5)' : undefined,
          borderRight: k.includes('r') ? '1.5px solid rgba(245,237,214,0.5)' : undefined,
        }
        return <div key={k} style={style} />
      })}

      {/* Top chrome */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ padding: '56px 22px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: C.cream }}>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 18,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
            border: 'none', cursor: 'pointer', color: C.cream,
            fontSize: 'var(--fs-18)', fontWeight: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
          <div style={{ textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.25em', opacity: 0.95 }}>◆ ON THIS DAY</div>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.65, letterSpacing: '0.18em', marginTop: 2 }}>
              {yearsAgo} YEAR{yearsAgo !== 1 ? 'S' : ''} AGO
            </div>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: 18,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'var(--fs-14)', color: C.cream, opacity: 0.6,
          }}>↗</div>
        </div>
      </div>

      {/* Metadata stamp — top right, rotated film slate */}
      <div style={{
        position: 'absolute', top: 88, right: 20, zIndex: 10,
        transform: 'rotate(2.5deg)',
        background: C.cream, padding: '8px 12px', borderRadius: 4,
        boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
      }}>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.rust, fontWeight: 700, letterSpacing: '0.2em' }}>
          FRAME · {photo.year}
        </div>
        <div className="badge" style={{ fontSize: 'var(--fs-13)', color: C.dark, marginTop: 2 }}>
          {monthDay}·{photo.year.toString().slice(2)}
        </div>
        {photo.location && (
          <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60, letterSpacing: '0.1em' }}>
            {photo.location}
          </div>
        )}
      </div>

      {/* Bottom content */}
      <div style={{
        position: 'absolute', bottom: 40, left: 0, right: 0,
        padding: '0 22px', color: C.cream, zIndex: 10,
      }}>
        {subtitle && (
          <div className="badge" style={{ fontSize: 'var(--fs-13)', opacity: 0.75, letterSpacing: '0.18em' }}>
            {subtitle.toUpperCase()}
          </div>
        )}
        {photo.caption ? (
          <div className="badge" style={{
            fontSize: 'var(--fs-56)', lineHeight: 0.88, marginTop: 4,
            letterSpacing: '-0.01em', textShadow: '0 2px 16px rgba(0,0,0,0.5)',
          }}>
            {photo.caption.split(' ').slice(0, 3).join(' ').toUpperCase()}.
          </div>
        ) : (
          <div className="badge" style={{
            fontSize: 'var(--fs-22)', lineHeight: 1, marginTop: 4,
            letterSpacing: '0.02em',
          }}>
            {photo.takenAt.toUpperCase()}
          </div>
        )}

        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(245,237,214,0.6), rgba(245,237,214,0))', margin: '12px 0' }} />

        {photo.caption && (
          <div style={{ fontSize: 'var(--fs-14)', lineHeight: 1.5, fontStyle: 'italic', maxWidth: 320, opacity: 0.92 }}>
            "{photo.caption}"
          </div>
        )}

        <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.55, marginTop: 8, letterSpacing: '0.15em' }}>
          — FIELD NOTE · {photo.year}
        </div>

        {/* Swipe hint */}
        <div className="mono" style={{ fontSize: 'var(--fs-10)', marginTop: 14, opacity: 0.5, textAlign: 'center', letterSpacing: '0.15em' }}>
          ← SWIPE · NEXT MEMORY →
        </div>
      </div>
    </div>
  )
}
