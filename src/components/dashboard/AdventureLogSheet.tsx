import { useState } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { logicalToday } from '../../lib/utils'
import { logAdventure, ADVENTURE_META, ADVENTURE_CATEGORIES, type Adventure, type AdventureCategory } from '../../lib/adventures'

interface Props {
  dark?: boolean
  suggested?: Adventure | null     // prefill category + link if logging the suggestion
  relief?: string | null           // snapshot of today's childcare relief
  onClose: () => void
  onSaved: () => void
}

function StarPicker({ value, onChange, dark }: { value: number; onChange: (v: number) => void; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 22,
          color: n <= value ? C.rust : (dark ? 'rgba(245,237,214,0.35)' : 'rgba(26,18,8,0.3)'),
        }}>
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}

export function AdventureLogSheet({ dark, suggested, relief, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const [dateDone, setDateDone] = useState(logicalToday())
  const [category, setCategory] = useState<AdventureCategory>(suggested?.category ?? 'other')
  const [isReal, setIsReal] = useState(false)
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState(suggested ? suggested.name : '')
  const [saving, setSaving] = useState(false)

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end',
  }
  const sheet: React.CSSProperties = {
    width: '100%', maxWidth: 600, margin: '0 auto',
    background: dark ? '#1a1208' : '#f5edd6',
    borderRadius: '20px 20px 0 0', padding: '24px 20px 40px',
    color: dark ? C.cream : C.dark,
  }
  const label: React.CSSProperties = {
    fontSize: 'var(--fs-11)', letterSpacing: '0.08em', opacity: 0.55,
    marginBottom: 6, textTransform: 'uppercase', fontFamily: 'inherit',
  }
  const input: React.CSSProperties = {
    width: '100%', background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(26,18,8,0.07)',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(26,18,8,0.15)'}`,
    borderRadius: 10, padding: '8px 12px', color: dark ? C.cream : C.dark,
    fontSize: 'var(--fs-13)', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  async function save() {
    if (!user) return
    setSaving(true)
    await logAdventure({
      userId: user.id,
      date: dateDone,
      category,
      adventureId: suggested && suggested.category === category ? suggested.id : null,
      isReal,
      rating: rating || null,
      relief: relief ?? null,
      note: notes || null,
    })
    onSaved()
    onClose()
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={sheet}>
        <div className="badge" style={{ fontSize: 'var(--fs-11)', opacity: 0.45, marginBottom: 4 }}>
          LOG ADVENTURE
        </div>
        <div className="badge" style={{ fontSize: 'var(--fs-16)', marginBottom: 20 }}>
          We got out today 🎉
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={label}>What kind?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ADVENTURE_CATEGORIES.map(cat => {
              const on = cat === category
              return (
                <button key={cat} onClick={() => setCategory(cat)} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 'var(--fs-12)',
                  background: on ? C.rust : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(26,18,8,0.05)'),
                  border: `1px solid ${on ? C.rust : (dark ? 'rgba(255,255,255,0.15)' : 'rgba(26,18,8,0.15)')}`,
                  color: on ? '#fff' : (dark ? C.cream : C.dark),
                }}>
                  <span>{ADVENTURE_META[cat].emoji}</span>{ADVENTURE_META[cat].label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={label}>Date</div>
          <input type="date" value={dateDone} onChange={e => setDateDone(e.target.value)} style={input} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={label}>Notes</div>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Where'd you go?" style={input} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={label}>Family rating</div>
          <StarPicker value={rating} onChange={setRating} dark={dark} />
        </div>

        {/* The weekly "real adventure" star — delight, not a quota. */}
        <button onClick={() => setIsReal(v => !v)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', marginBottom: 24, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
          textAlign: 'left',
          background: isReal ? 'rgba(196,82,42,0.15)' : 'transparent',
          border: `1px solid ${isReal ? C.rust : (dark ? 'rgba(255,255,255,0.15)' : 'rgba(26,18,8,0.15)')}`,
          color: dark ? C.cream : C.dark,
        }}>
          <span style={{ fontSize: 18, color: isReal ? C.rust : 'inherit' }}>{isReal ? '★' : '☆'}</span>
          <div>
            <div className="badge" style={{ fontSize: 'var(--fs-13)' }}>Mark as a real adventure</div>
            <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.55 }}>A bigger one — a hike, a trip. Lights this week's star.</div>
          </div>
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px 0', borderRadius: 12, background: 'transparent',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(26,18,8,0.2)'}`,
            color: dark ? C.cream : C.dark, fontSize: 'var(--fs-13)', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} style={{
            flex: 2, padding: '12px 0', borderRadius: 12, background: C.rust, border: 'none',
            color: '#fff', fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer',
          }}>
            {saving ? 'Saving…' : 'Log it ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
