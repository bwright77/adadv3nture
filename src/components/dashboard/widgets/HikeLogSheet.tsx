import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { C } from '../../../tokens'
import type { Hike } from '../../../hooks/use50Hikes'

interface Props {
  hike: Hike
  dark?: boolean
  onClose: () => void
  onSaved: () => void
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: 20, color: n <= value ? C.rust : C.ink40,
          }}
        >
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}

export function HikeLogSheet({ hike, dark, onClose, onSaved }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [dateDone, setDateDone] = useState(hike.date_done ?? today)
  const [rating, setRating] = useState(hike.family_rating ?? 0)
  const [notes, setNotes] = useState(hike.notes ?? '')
  const [saving, setSaving] = useState(false)

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end',
  }
  const sheet: React.CSSProperties = {
    width: '100%', maxWidth: 600, margin: '0 auto',
    background: dark ? '#1a1208' : '#f5edd6',
    borderRadius: '20px 20px 0 0',
    padding: '24px 20px 40px',
    color: dark ? C.cream : C.dark,
  }
  const label: React.CSSProperties = {
    fontSize: 'var(--fs-11)', letterSpacing: '0.08em', opacity: 0.55,
    marginBottom: 6, textTransform: 'uppercase' as const, fontFamily: 'inherit',
  }
  const input: React.CSSProperties = {
    width: '100%', background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(26,18,8,0.07)',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(26,18,8,0.15)'}`,
    borderRadius: 10, padding: '8px 12px', color: dark ? C.cream : C.dark,
    fontSize: 'var(--fs-13)', fontFamily: 'inherit', boxSizing: 'border-box' as const,
  }

  async function save() {
    setSaving(true)
    await (supabase as any).from('hikes_50').update({
      done: true,
      date_done: dateDone,
      family_rating: rating || null,
      notes: notes || null,
    }).eq('id', hike.id)
    onSaved()
    onClose()
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={sheet}>
        <div className="badge" style={{ fontSize: 'var(--fs-11)', opacity: 0.45, marginBottom: 4 }}>
          LOG COMPLETION · #{hike.book_number}
        </div>
        <div className="badge" style={{ fontSize: 'var(--fs-16)', marginBottom: 20 }}>
          {hike.name}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={label}>Date</div>
          <input type="date" value={dateDone} onChange={e => setDateDone(e.target.value)} style={input} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={label}>Family Rating</div>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div className="mono" style={label}>Notes</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How'd it go?"
            rows={3}
            style={{ ...input, resize: 'vertical' as const }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px 0', borderRadius: 12,
            background: 'transparent',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(26,18,8,0.2)'}`,
            color: dark ? C.cream : C.dark, fontSize: 'var(--fs-13)', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} style={{
            flex: 2, padding: '12px 0', borderRadius: 12,
            background: C.rust, border: 'none',
            color: '#fff', fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer',
          }}>
            {saving ? 'Saving…' : 'Mark Done ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
