import { useState } from 'react'
import { C } from '../../../tokens'
import type { AdventureType, WeekendPlan } from '../../../hooks/useWeekendPlan'

const TYPES: { key: AdventureType; label: string; icon: string }[] = [
  { key: 'run',     label: 'Run',     icon: '🏃' },
  { key: 'ride',    label: 'Ride',    icon: '🚴' },
  { key: 'hike',    label: 'Hike',    icon: '🥾' },
  { key: 'ski',     label: 'Ski',     icon: '⛷' },
  { key: 'family',  label: 'Family',  icon: '👨‍👩‍👧' },
  { key: 'project', label: 'Project', icon: '🔧' },
  { key: 'other',   label: 'Other',   icon: '✦' },
]

interface Props {
  existing?: WeekendPlan | null
  dark?: boolean
  onClose: () => void
  onSave: (fields: Omit<WeekendPlan, 'id' | 'plan_date'>) => Promise<void>
  onClear?: () => void
}

export function PlanDaySheet({ existing, dark, onClose, onSave, onClear }: Props) {
  const [type, setType] = useState<AdventureType | null>(existing?.activity_type ?? null)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [location, setLocation] = useState(existing?.location ?? '')
  const [departure, setDeparture] = useState(existing?.departure_time ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end',
  }
  const sheet: React.CSSProperties = {
    width: '100%', maxWidth: 600, margin: '0 auto',
    background: dark ? '#1a1208' : '#f5edd6',
    borderRadius: '20px 20px 0 0',
    padding: '24px 20px 40px',
    color: dark ? C.cream : C.dark,
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--fs-11)', letterSpacing: '0.08em', opacity: 0.55,
    marginBottom: 6, textTransform: 'uppercase',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(26,18,8,0.07)',
    border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(26,18,8,0.15)'}`,
    borderRadius: 10, padding: '8px 12px', color: dark ? C.cream : C.dark,
    fontSize: 'var(--fs-13)', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  async function save() {
    setSaving(true)
    await onSave({
      activity_type: type,
      title: title || null,
      location: location || null,
      departure_time: departure || null,
      notes: notes || null,
    })
    onClose()
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={sheet}>
        <div className="badge" style={{ fontSize: 'var(--fs-16)', marginBottom: 20 }}>Plan the Day</div>

        {/* Type pills */}
        <div style={{ marginBottom: 16 }}>
          <div className="mono" style={labelStyle}>What's the move?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                style={{
                  padding: '6px 12px', borderRadius: 20,
                  background: type === t.key ? C.rust : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(26,18,8,0.07)'),
                  border: `1px solid ${type === t.key ? C.rust : (dark ? 'rgba(255,255,255,0.18)' : 'rgba(26,18,8,0.15)')}`,
                  color: type === t.key ? '#fff' : (dark ? C.cream : C.dark),
                  fontSize: 'var(--fs-12)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 12 }}>
          <div className="mono" style={labelStyle}>Name</div>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={type === 'run' ? 'Mt. Falcon loop' : type === 'ride' ? 'Bear Creek gravel' : 'What are you doing?'}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {/* Location */}
          <div>
            <div className="mono" style={labelStyle}>Where</div>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Morrison" style={inputStyle} />
          </div>
          {/* Departure */}
          <div>
            <div className="mono" style={labelStyle}>Leave by</div>
            <input type="time" value={departure} onChange={e => setDeparture(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 24 }}>
          <div className="mono" style={labelStyle}>Notes</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Pack snacks, wear layers…"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {existing && onClear && (
            <button onClick={onClear} style={{
              padding: '12px 0', borderRadius: 12, width: 44, flexShrink: 0,
              background: 'transparent',
              border: `1px solid ${dark ? 'rgba(255,100,100,0.3)' : 'rgba(196,82,42,0.3)'}`,
              color: C.rust, fontSize: 'var(--fs-16)', cursor: 'pointer',
            }}>
              ✕
            </button>
          )}
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
            {saving ? 'Saving…' : 'Lock It In'}
          </button>
        </div>
      </div>
    </div>
  )
}
