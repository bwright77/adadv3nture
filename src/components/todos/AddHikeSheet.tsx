import { useState } from 'react'
import { C } from '../../tokens'
import { logicalToday } from '../../lib/utils'
import type { NewHike } from '../../hooks/useFamilyHikes'

interface Props {
  onClose: () => void
  onAdd: (fields: NewHike) => Promise<void>
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 22,
          color: n <= value ? C.rust : 'rgba(26,18,8,0.3)',
        }}>
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}

// Add a family hike — as a "want to do" for inspiration, or logged as already done.
export function AddHikeSheet({ onClose, onAdd }: Props) {
  const [name, setName] = useState('')
  const [hub, setHub] = useState('')
  const [allTrailsUrl, setAllTrailsUrl] = useState('')
  const [distance, setDistance] = useState('')
  const [driveMin, setDriveMin] = useState('')
  const [alreadyDid, setAlreadyDid] = useState(false)
  const [dateDone, setDateDone] = useState(logicalToday())
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end',
  }
  const sheet: React.CSSProperties = {
    width: '100%', maxWidth: 600, margin: '0 auto',
    background: '#f5edd6', borderRadius: '20px 20px 0 0',
    padding: '24px 20px 40px', color: C.dark, maxHeight: '88vh', overflowY: 'auto',
  }
  const label: React.CSSProperties = {
    fontSize: 'var(--fs-11)', letterSpacing: '0.08em', opacity: 0.55,
    marginBottom: 6, textTransform: 'uppercase', fontFamily: 'inherit',
  }
  const input: React.CSSProperties = {
    width: '100%', background: 'rgba(26,18,8,0.07)',
    border: '1px solid rgba(26,18,8,0.15)', borderRadius: 10, padding: '8px 12px',
    color: C.dark, fontSize: 'var(--fs-13)', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    await onAdd({
      name: name.trim(),
      hub: hub.trim() || null,
      alltrails_url: allTrailsUrl.trim() || null,
      distance_mi: distance ? parseFloat(distance) : null,
      drive_minutes_denver: driveMin ? parseInt(driveMin, 10) : null,
      done: alreadyDid,
      date_done: alreadyDid ? dateDone : null,
      family_rating: alreadyDid && rating ? rating : null,
      notes: notes.trim() || null,
    })
    onClose()
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={sheet}>
        <div className="badge" style={{ fontSize: 'var(--fs-11)', opacity: 0.45, marginBottom: 4 }}>
          ADD A FAMILY HIKE
        </div>
        <div className="badge" style={{ fontSize: 'var(--fs-16)', marginBottom: 20 }}>
          Add one you want to do, or log one you've done
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={label}>Name</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lair o' the Bear loop" style={input} autoFocus />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={label}>AllTrails link (optional)</div>
          <input value={allTrailsUrl} onChange={e => setAllTrailsUrl(e.target.value)} inputMode="url" placeholder="https://www.alltrails.com/trail/…" style={input} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 2 }}>
            <div className="mono" style={label}>Area — locates the hike</div>
            <input value={hub} onChange={e => setHub(e.target.value)} placeholder="Salida" style={input} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="mono" style={label}>Miles</div>
            <input value={distance} onChange={e => setDistance(e.target.value)} inputMode="decimal" placeholder="3.2" style={input} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="mono" style={label}>Drive</div>
            <input value={driveMin} onChange={e => setDriveMin(e.target.value)} inputMode="numeric" placeholder="35" style={input} />
          </div>
        </div>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.5, marginBottom: 20, lineHeight: 1.4 }}>
          The town/area places the hike on the map so it shows up when you're nearby. (AllTrails blocks reading coordinates from the link.)
        </div>

        {/* Did we already do it? Reveals completion fields. */}
        <button onClick={() => setAlreadyDid(v => !v)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', marginBottom: alreadyDid ? 16 : 24, borderRadius: 12,
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          background: alreadyDid ? 'rgba(196,82,42,0.1)' : 'transparent',
          border: `1px solid ${alreadyDid ? C.rust : 'rgba(26,18,8,0.15)'}`, color: C.dark,
        }}>
          <span style={{ fontSize: 16, color: alreadyDid ? C.rust : 'inherit' }}>{alreadyDid ? '☑' : '☐'}</span>
          <div className="badge" style={{ fontSize: 'var(--fs-13)' }}>We already did this one</div>
        </button>

        {alreadyDid && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div className="mono" style={label}>Date</div>
              <input type="date" value={dateDone} onChange={e => setDateDone(e.target.value)} style={input} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div className="mono" style={label}>Family rating</div>
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div className="mono" style={label}>Notes</div>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="How'd it go?" style={input} />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px 0', borderRadius: 12, background: 'transparent',
            border: '1px solid rgba(26,18,8,0.2)', color: C.dark, fontSize: 'var(--fs-13)', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving || !name.trim()} style={{
            flex: 2, padding: '12px 0', borderRadius: 12,
            background: name.trim() ? C.rust : 'rgba(26,18,8,0.2)', border: 'none',
            color: '#fff', fontSize: 'var(--fs-13)', fontWeight: 700,
            cursor: name.trim() ? 'pointer' : 'default',
          }}>
            {saving ? 'Saving…' : alreadyDid ? 'Add + log ✓' : 'Add hike'}
          </button>
        </div>
      </div>
    </div>
  )
}
