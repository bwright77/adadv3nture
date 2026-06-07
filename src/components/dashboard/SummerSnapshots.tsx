import { useEffect, useRef, useState } from 'react'
import { Glass } from '../ui/Glass'
import { CardLabel } from '../ui/CardLabel'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { useLocation } from '../../hooks/useLocation'
import { SUMMER_START } from '../../hooks/useSummerMode'
import { logicalToday } from '../../lib/utils'
import { getPhotosSince, addInspirationPhoto, type InspirationPhoto } from '../../lib/inspiration'
import { InspireDetail } from './InspireDetail'

interface Props { dark?: boolean }

// Summer snapshots — a delight, not a tracker. Drop a couple photos a week and
// the season catalogs itself. Each one flows into the inspiration library, so
// today's snapshot resurfaces later as an "on this day" memory. No nag, no goal.
export function SummerSnapshots({ dark = true }: Props) {
  const { user } = useAuth()
  const { location } = useLocation()
  const [photos, setPhotos] = useState<InspirationPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [zoom, setZoom] = useState<InspirationPhoto | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const accent = C.teal
  const subColor = dark ? 'rgba(245,237,214,0.6)' : C.ink60

  async function load() {
    if (!user) return
    try { setPhotos(await getPhotosSince(user.id, SUMMER_START)) } catch { /* keep prior */ }
  }
  useEffect(() => { load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // allow re-picking the same file
    if (!user || files.length === 0) return
    setUploading(true)
    try {
      for (const f of files) {
        await addInspirationPhoto(user.id, f, {
          takenAt: logicalToday(),
          location: location.isKnown ? location.name : null,
          activityType: 'family',
        })
      }
      await load()
    } catch {
      // best-effort — a failed upload just doesn't appear
    } finally {
      setUploading(false)
    }
  }

  return (
    <Glass dark={dark} span={12} pad={14}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <CardLabel dark={dark} accent={accent}>Summer snapshots</CardLabel>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mono"
          style={{
            fontSize: 'var(--fs-11)', letterSpacing: '0.06em',
            background: `${accent}26`, color: dark ? C.cream : C.tealDk,
            border: `1px solid ${accent}`, borderRadius: 999, padding: '4px 12px',
            cursor: uploading ? 'default' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {uploading ? 'Adding…' : '+ Add photo'}
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple
        onChange={onFiles} style={{ display: 'none' }} />

      {photos.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: '100%', textAlign: 'left', background: 'none', cursor: 'pointer', fontFamily: 'inherit',
            border: `1px dashed ${dark ? 'rgba(245,237,214,0.3)' : C.ink20}`, borderRadius: 12, padding: '16px 14px',
          }}
        >
          <div className="mono" style={{ fontSize: 'var(--fs-12)', color: subColor, lineHeight: 1.5 }}>
            📸 Snap the summer — drop a couple photos a week. They become part of your inspiration memories.
          </div>
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, WebkitOverflowScrolling: 'touch' }}>
          {photos.map(p => (
            <button
              key={p.id}
              onClick={() => setZoom(p)}
              style={{
                flexShrink: 0, width: 72, height: 72, borderRadius: 10, overflow: 'hidden',
                border: `1px solid ${dark ? 'rgba(245,237,214,0.2)' : C.ink20}`, padding: 0, cursor: 'pointer',
                background: `url(${p.thumbnail_url}) center/cover no-repeat`,
              }}
              title={p.caption ?? p.takenAt}
            />
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: subColor, marginTop: 8 }}>
          {photos.length} this summer · tap to view
        </div>
      )}

      {/* Full-page viewer — same as inspiration photos, swiping the summer set */}
      {zoom && (
        <InspireDetail
          photo={zoom}
          photoSet={photos}
          startIndex={photos.findIndex(p => p.id === zoom.id)}
          onClose={() => setZoom(null)}
        />
      )}
    </Glass>
  )
}
