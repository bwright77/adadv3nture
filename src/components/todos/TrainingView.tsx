import { useState, useEffect, useRef } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { getTrainingGoals, getCurrentTrainingWeek, addTrainingGoal, updateTrainingGoalNotes, type TrainingGoal, type TrainingWeek, type TrainingEventType } from '../../lib/training'
import { getAllPrograms, addProgram, advanceProgram, setProgramPosition, deactivateProgram, syncProgramFromStrava, updateProgramImageUrl, type ProgramState } from '../../lib/program-tracker'
import { updateTrainingGoalImageUrl, updateTrainingGoalWebsiteUrl } from '../../lib/training'

function CardImageBanner({ url, color, radius = '0 14px 0 0' }: { url: string; color: string; radius?: string }) {
  return (
    <div style={{ position: 'relative', height: 72, overflow: 'hidden', borderRadius: radius }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)` }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: color }} />
    </div>
  )
}

const EVENT_COLOR: Record<string, string> = {
  trail_run:      C.rust,
  cycling_gravel: C.teal,
  cycling_road:   '#5B8FBF',
}

const EVENT_LABEL: Record<string, string> = {
  trail_run:      'TRAIL RUN',
  cycling_gravel: 'GRAVEL',
  cycling_road:   'ROAD CYCLING',
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function EventCard({ goal, onOpen }: { goal: TrainingGoal; onOpen: () => void }) {
  const days = daysUntil(goal.event_date)
  const color = EVENT_COLOR[goal.event_type] ?? C.rust
  const done = days < 0

  return (
    <button
      onClick={onOpen}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        position: 'relative', marginBottom: 10,
        opacity: done ? 0.45 : 1,
        background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', cursor: 'pointer',
      }}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: goal.is_anchor ? 5 : 4,
        background: goal.is_anchor ? `linear-gradient(180deg, ${color}, ${color}99)` : color,
        borderRadius: '4px 0 0 4px',
        boxShadow: goal.is_anchor ? `2px 0 10px ${color}44` : 'none',
      }} />
      <div style={{
        marginLeft: 4,
        background: goal.is_anchor ? `${color}08` : '#fff',
        border: goal.is_anchor ? `0.5px solid ${color}30` : `0.5px solid ${C.ink20}`,
        borderLeft: 'none', borderRadius: '0 14px 14px 0',
        overflow: 'hidden',
      }}>
        {goal.image_url && <CardImageBanner url={goal.image_url} color={color} />}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span className="mono" style={{ fontSize: 'var(--fs-10)', color, letterSpacing: '0.12em', fontWeight: 700 }}>
                {EVENT_LABEL[goal.event_type]}
              </span>
              {goal.is_anchor && (
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.rust, letterSpacing: '0.1em' }}>◆ ANCHOR</span>
              )}
            </div>
            <div style={{ fontSize: 'var(--fs-17)', fontWeight: 600, color: C.dark, lineHeight: 1.2, marginBottom: 4 }}>
              {goal.event_name}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {goal.location && (
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60 }}>{goal.location.toUpperCase()}</span>
              )}
              {goal.distance_label && (
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60 }}>{goal.distance_label.toUpperCase()}</span>
              )}
              {goal.elevation_label && (
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60 }}>{goal.elevation_label.toUpperCase()} ELEV</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {done ? (
              <div className="badge" style={{ fontSize: 'var(--fs-13)', color: C.teal }}>DONE</div>
            ) : (
              <>
                <div className="badge" style={{ fontSize: 'var(--fs-26)', lineHeight: 1, color: goal.is_anchor ? color : C.dark }}>{days}</div>
                <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em' }}>DAYS</div>
                <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, marginTop: 2 }}>{formatDate(goal.event_date)}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function EventDetail({ goal, onClose, onUpdate }: {
  goal: TrainingGoal
  onClose: () => void
  onUpdate: (g: TrainingGoal) => void
}) {
  const [notes, setNotes] = useState(goal.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [editingImage, setEditingImage] = useState(false)
  const [imageDraft, setImageDraft] = useState(goal.image_url ?? '')
  const [editingUrl, setEditingUrl] = useState(false)
  const [urlDraft, setUrlDraft] = useState(goal.website_url ?? '')
  const days = daysUntil(goal.event_date)
  const color = EVENT_COLOR[goal.event_type] ?? C.rust

  async function save() {
    setSaving(true)
    try {
      const updated = await updateTrainingGoalNotes(goal.id, notes)
      onUpdate(updated)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function saveImage() {
    await updateTrainingGoalImageUrl(goal.id, imageDraft)
    onUpdate({ ...goal, image_url: imageDraft.trim() || null })
    setEditingImage(false)
  }

  async function saveUrl() {
    await updateTrainingGoalWebsiteUrl(goal.id, urlDraft)
    onUpdate({ ...goal, website_url: urlDraft.trim() || null })
    setEditingUrl(false)
  }

  const meta: [string, string][] = [
    ['DATE', formatDate(goal.event_date)],
    ['COUNTDOWN', days < 0 ? 'COMPLETE' : `${days}d · ${Math.floor(days / 7)}wk`],
    ...(goal.distance_label ? [['DISTANCE', goal.distance_label] as [string, string]] : []),
    ...(goal.elevation_label ? [['ELEVATION', goal.elevation_label] as [string, string]] : []),
    ...(goal.location ? [['LOCATION', goal.location] as [string, string]] : []),
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: C.paper, overflowY: 'auto' }}>
      <div style={{
        background: goal.image_url ? 'transparent' : color,
        padding: 'calc(env(safe-area-inset-top, 0px) + 56px) 18px 24px',
        position: 'relative',
        minHeight: goal.image_url ? 180 : 'auto',
      }}>
        {goal.image_url && (
          <>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${goal.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)' }} />
          </>
        )}
        <button onClick={onClose} style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 16,
          background: 'rgba(255,255,255,0.22)', border: 'none', borderRadius: 20,
          padding: '5px 14px', color: '#fff', fontSize: 'var(--fs-13)', cursor: 'pointer', zIndex: 1,
        }}>← Back</button>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.15em', marginBottom: 4 }}>
            {EVENT_LABEL[goal.event_type]}{goal.is_anchor ? ' · ◆ ANCHOR' : ''}
          </div>
          <div className="badge" style={{ fontSize: 'var(--fs-28)', color: '#fff', lineHeight: 1.1 }}>
            {goal.event_name}
          </div>
          {editingImage ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <input
                autoFocus
                value={imageDraft}
                onChange={e => setImageDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveImage(); if (e.key === 'Escape') setEditingImage(false) }}
                placeholder="Image URL…"
                style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8, padding: '5px 10px', color: '#fff', fontSize: 'var(--fs-13)', outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={saveImage} style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 'var(--fs-12)', fontWeight: 700, cursor: 'pointer' }}>Set</button>
              <button onClick={() => setEditingImage(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '5px 10px', color: '#fff', fontSize: 'var(--fs-13)', cursor: 'pointer' }}>×</button>
            </div>
          ) : (
            <button onClick={() => { setEditingImage(true); setImageDraft(goal.image_url ?? '') }} style={{ marginTop: 8, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.8)', fontSize: 'var(--fs-11)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {goal.image_url ? '✎' : '+ Add image'}
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 18px 100px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: `0.5px solid ${C.ink20}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
            {meta.map(([label, val]) => (
              <div key={label}>
                <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 'var(--fs-15)', fontWeight: 600, color: C.dark }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${C.ink20}` }}>
            {editingUrl ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={urlDraft}
                  onChange={e => setUrlDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveUrl(); if (e.key === 'Escape') setEditingUrl(false) }}
                  placeholder="https://…"
                  style={{ flex: 1, border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '6px 10px', fontSize: 'var(--fs-13)', fontFamily: 'inherit', outline: 'none', minWidth: 0 }}
                />
                <button onClick={saveUrl} style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 'var(--fs-12)', fontWeight: 700, cursor: 'pointer' }}>Set</button>
                <button onClick={() => setEditingUrl(false)} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-16)', cursor: 'pointer' }}>×</button>
              </div>
            ) : goal.website_url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em', flexShrink: 0 }}>WEBSITE</span>
                <a href={goal.website_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 'var(--fs-13)', color, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                  {goal.website_url.replace(/^https?:\/\//, '')}
                </a>
                <button onClick={() => { setEditingUrl(true); setUrlDraft(goal.website_url ?? '') }} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-15)', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}>✎</button>
              </div>
            ) : (
              <button onClick={() => setEditingUrl(true)} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-13)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>+ Add website</button>
            )}
          </div>
        </div>

        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em', marginBottom: 8 }}>NOTES</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Race strategy, goals, gear notes…"
          rows={5}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: `1px solid ${C.ink20}`, borderRadius: 10, padding: '10px 12px',
            fontSize: 'var(--fs-14)', fontFamily: 'inherit', color: C.dark,
            resize: 'none', outline: 'none', background: '#fff',
          }}
        />
        <button
          onClick={save}
          disabled={saving || notes === (goal.notes ?? '')}
          style={{
            marginTop: 10, background: color, color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 24px', fontSize: 'var(--fs-14)',
            fontWeight: 700, cursor: 'pointer',
            opacity: (saving || notes === (goal.notes ?? '')) ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  )
}

function WeekCard({ week }: { week: TrainingWeek }) {
  const items: { label: string; target: number | null; actual: number | null; unit: string }[] = [
    { label: 'RUN',      target: week.target_run_miles,        actual: week.actual_run_miles,         unit: 'MI' },
    { label: 'LONG RUN', target: week.target_long_run_miles,   actual: null,                          unit: 'MI' },
    { label: 'CYCLING',  target: week.target_cycling_miles,    actual: week.actual_cycling_miles,     unit: 'MI' },
    { label: 'STRENGTH', target: week.target_strength_sessions,actual: week.actual_strength_sessions, unit: 'X' },
  ].filter(i => (i.target ?? 0) > 0)

  return (
    <div style={{
      background: '#fff', border: `0.5px solid ${C.ink20}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em' }}>THIS WEEK</div>
          <div className="badge" style={{ fontSize: 'var(--fs-16)', color: C.dark, letterSpacing: '0.04em' }}>{week.phase_label}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 8 }}>
        {items.map(item => {
          const pct = item.actual != null && item.target ? Math.min(100, (item.actual / item.target) * 100) : null
          return (
            <div key={item.label} style={{
              background: C.paper, borderRadius: 10, padding: '8px 10px', textAlign: 'center',
            }}>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em', marginBottom: 4 }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                <span className="badge" style={{ fontSize: 'var(--fs-20)', lineHeight: 1, color: C.dark }}>{item.target}</span>
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40 }}>{item.unit}</span>
              </div>
              {pct !== null && (
                <div style={{ height: 3, background: C.ink20, borderRadius: 2, marginTop: 6 }}>
                  <div style={{ height: 3, width: `${pct}%`, background: C.teal, borderRadius: 2 }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProgramCard({ program, onAdvance, onRemove }: {
  program: ProgramState
  onAdvance: () => void
  onRemove: () => void
}) {
  const [editingPos, setEditingPos] = useState(false)
  const [editingImage, setEditingImage] = useState(false)
  const [draftWeek, setDraftWeek] = useState(String(program.current_week))
  const [draftDay, setDraftDay] = useState(String(program.current_day))
  const [imageDraft, setImageDraft] = useState(program.image_url ?? '')
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()

  const totalWeeks = program.total_weeks
  const pct = totalWeeks ? Math.round(((program.current_week - 1) * 4 + program.current_day) / (totalWeeks * 4) * 100) : null
  const lastDone = program.last_completed_date
    ? new Date(program.last_completed_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  async function handleAdvance() {
    setSaving(true)
    await advanceProgram(user!.id)
    onAdvance()
    setSaving(false)
  }

  async function handleSaveImage() {
    await updateProgramImageUrl(program.id, imageDraft)
    onAdvance() // refetch programs
    setEditingImage(false)
  }

  async function handleSetPosition() {
    const w = parseInt(draftWeek)
    const d = parseInt(draftDay)
    if (!w || !d || w < 1 || d < 1 || d > 4) return
    setSaving(true)
    await setProgramPosition(program.id, w, d, program.program_name)
    onAdvance()
    setEditingPos(false)
    setSaving(false)
  }

  return (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: C.teal, borderRadius: '4px 0 0 4px',
      }} />
      <div style={{
        marginLeft: 4, background: '#fff',
        border: `0.5px solid ${C.ink20}`, borderLeft: 'none',
        borderRadius: '0 14px 14px 0', overflow: 'hidden',
      }}>
        {program.image_url && <CardImageBanner url={program.image_url} color={C.teal} />}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.teal, letterSpacing: '0.12em', fontWeight: 700, marginBottom: 2 }}>
              STRENGTH PROGRAM
            </div>
            <div style={{ fontSize: 'var(--fs-16)', fontWeight: 600, color: C.dark, lineHeight: 1.2 }}>
              {program.program_name}
            </div>
            {program.instructor && (
              <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink60, marginTop: 1 }}>
                {program.instructor}
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              {program.next_workout_title && (
                <div style={{ fontSize: 'var(--fs-13)', color: C.dark, marginBottom: 6 }}>
                  {program.next_workout_title}
                </div>
              )}
              {editingPos ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40 }}>Week</span>
                  <input
                    type="number" min="1" value={draftWeek}
                    onChange={e => setDraftWeek(e.target.value)}
                    style={{ width: 44, border: `1px solid ${C.ink20}`, borderRadius: 6, padding: '3px 6px', fontSize: 'var(--fs-13)', textAlign: 'center' }}
                  />
                  <span className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40 }}>Day</span>
                  <input
                    type="number" min="1" max="4" value={draftDay}
                    onChange={e => setDraftDay(e.target.value)}
                    style={{ width: 44, border: `1px solid ${C.ink20}`, borderRadius: 6, padding: '3px 6px', fontSize: 'var(--fs-13)', textAlign: 'center' }}
                  />
                  <button onClick={handleSetPosition} disabled={saving} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 'var(--fs-12)', fontWeight: 700, cursor: 'pointer' }}>Set</button>
                  <button onClick={() => setEditingPos(false)} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-16)', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingPos(true); setDraftWeek(String(program.current_week)); setDraftDay(String(program.current_day)) }}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                >
                  <span className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40, letterSpacing: '0.08em' }}>
                    W{program.current_week}D{program.current_day}
                    {lastDone ? ` · last done ${lastDone}` : ''}
                  </span>
                </button>
              )}
              {pct !== null && (
                <div style={{ height: 3, background: C.ink20, borderRadius: 2, marginTop: 8 }}>
                  <div style={{ height: 3, width: `${pct}%`, background: C.teal, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleAdvance}
              disabled={saving}
              style={{
                background: C.teal, color: '#fff', border: 'none',
                borderRadius: 10, padding: '7px 14px',
                fontSize: 'var(--fs-12)', fontWeight: 700, cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              ✓ Done
            </button>
            <button
              onClick={onRemove}
              style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-11)', cursor: 'pointer', padding: 0 }}
            >
              retire
            </button>
          </div>
        </div>
        {/* Image URL editor */}
        {editingImage ? (
          <div style={{ display: 'flex', gap: 6, padding: '0 12px 10px' }}>
            <input
              autoFocus
              value={imageDraft}
              onChange={e => setImageDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveImage(); if (e.key === 'Escape') setEditingImage(false) }}
              placeholder="Image URL…"
              style={{ flex: 1, border: `1px solid ${C.ink20}`, borderRadius: 6, padding: '4px 8px', fontSize: 'var(--fs-12)', fontFamily: 'inherit', outline: 'none', minWidth: 0 }}
            />
            <button onClick={handleSaveImage} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 'var(--fs-11)', fontWeight: 700, cursor: 'pointer' }}>Set</button>
            <button onClick={() => setEditingImage(false)} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-16)', cursor: 'pointer' }}>×</button>
          </div>
        ) : (
          <button onClick={() => { setEditingImage(true); setImageDraft(program.image_url ?? '') }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0 12px 8px', background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-11)', cursor: 'pointer', fontFamily: 'inherit' }}>
            {program.image_url ? '✎' : '+ Add image'}
          </button>
        )}
      </div>
    </div>
  )
}

function AddProgramForm({ onSave, onCancel }: { onSave: (p: ProgramState) => void; onCancel: () => void }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [instructor, setInstructor] = useState('')
  const [totalWeeks, setTotalWeeks] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  async function handleSave() {
    if (!user || !name.trim()) return
    setSaving(true)
    try {
      const p = await addProgram(user.id, name.trim(), {
        instructor: instructor.trim() || undefined,
        totalWeeks: totalWeeks ? parseInt(totalWeeks) : undefined,
      })
      onSave(p)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px',
    fontSize: 'var(--fs-14)', background: '#fff', color: C.dark,
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, outline: 'none',
  }

  return (
    <div style={{ background: '#fff', border: `1.5px solid ${C.teal}`, borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
      <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.teal, letterSpacing: '0.12em', marginBottom: 10 }}>NEW PROGRAM</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input ref={nameRef} style={inputStyle} placeholder="Program name (e.g. Total Strength)" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onCancel() }} />
        <input style={inputStyle} placeholder="Instructor (optional)" value={instructor} onChange={e => setInstructor(e.target.value)} />
        <input style={{ ...inputStyle, minWidth: 0 }} type="number" placeholder="Total weeks (optional)" value={totalWeeks} onChange={e => setTotalWeeks(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-14)', cursor: 'pointer', padding: '6px 10px' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{
            background: C.teal, color: '#fff', border: 'none', borderRadius: 8,
            padding: '6px 16px', fontSize: 'var(--fs-14)', fontWeight: 700, cursor: 'pointer',
            opacity: !name.trim() ? 0.5 : 1,
          }}>
            {saving ? 'Saving…' : 'Add Program'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddEventForm({ onSave, onCancel }: { onSave: (g: TrainingGoal) => void; onCancel: () => void }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<TrainingEventType>('trail_run')
  const [location, setLocation] = useState('')
  const [distance, setDistance] = useState('')
  const [elevation, setElevation] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  async function handleSave() {
    if (!user || !name.trim() || !date) return
    setSaving(true)
    try {
      const g = await addTrainingGoal(user.id, name.trim(), date, type, {
        location: location.trim() || undefined,
        distance_label: distance.trim() || undefined,
        elevation_label: elevation.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
      })
      onSave(g)
    } catch {
      setSaving(false)
    }
  }

  const inputStyle = {
    border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px',
    fontSize: 'var(--fs-14)', background: '#fff', color: C.dark,
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, outline: 'none',
  }

  return (
    <div style={{
      background: '#fff', border: `1.5px solid ${C.teal}`, borderRadius: 14,
      padding: '14px 16px', marginBottom: 10,
    }}>
      <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.teal, letterSpacing: '0.12em', marginBottom: 10 }}>NEW EVENT</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input ref={nameRef} style={inputStyle} placeholder="Event name" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onCancel() }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 0 }}>
          <input style={{ ...inputStyle, minWidth: 0 }} type="date" value={date} onChange={e => setDate(e.target.value)} />
          <select style={{ ...inputStyle, minWidth: 0 }} value={type} onChange={e => setType(e.target.value as TrainingEventType)}>
            <option value="trail_run">Trail Run</option>
            <option value="cycling_gravel">Gravel Cycling</option>
            <option value="cycling_road">Road Cycling</option>
          </select>
        </div>
        <input style={inputStyle} placeholder="Location (optional)" value={location} onChange={e => setLocation(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, minWidth: 0 }}>
          <input style={{ ...inputStyle, minWidth: 0 }} placeholder="Distance (e.g. 18.6mi)" value={distance} onChange={e => setDistance(e.target.value)} />
          <input style={{ ...inputStyle, minWidth: 0 }} placeholder="Elevation (e.g. 3,200ft)" value={elevation} onChange={e => setElevation(e.target.value)} />
        </div>
        <input style={inputStyle} placeholder="Event website URL (optional)" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-14)', cursor: 'pointer', padding: '6px 10px' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim() || !date} style={{
            background: C.teal, color: '#fff', border: 'none', borderRadius: 8,
            padding: '6px 16px', fontSize: 'var(--fs-14)', fontWeight: 700, cursor: 'pointer',
            opacity: (!name.trim() || !date) ? 0.5 : 1,
          }}>
            {saving ? 'Saving…' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function TrainingView() {
  const { user } = useAuth()
  const [goals, setGoals] = useState<TrainingGoal[]>([])
  const [week, setWeek] = useState<TrainingWeek | null>(null)
  const [programs, setPrograms] = useState<ProgramState[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [addingProgram, setAddingProgram] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      getTrainingGoals(user.id),
      getCurrentTrainingWeek(user.id),
      getAllPrograms(user.id),
    ]).then(async ([g, w, p]) => {
      setGoals(g)
      setWeek(w)
      // Sync each active program against Strava history, then refetch if any changed
      const synced = await Promise.all(p.map(prog => syncProgramFromStrava(user.id, prog)))
      const anyUpdated = synced.some(n => n > 0)
      if (anyUpdated) {
        const refreshed = await getAllPrograms(user.id)
        setPrograms(refreshed)
      } else {
        setPrograms(p)
      }
    }).catch(() => null).finally(() => setLoading(false))
  }, [user])

  async function handleProgramAdvance() {
    if (!user) return
    const updated = await getAllPrograms(user.id)
    setPrograms(updated)
  }

  async function handleProgramRemove(id: string) {
    await deactivateProgram(id)
    setPrograms(prev => prev.filter(p => p.id !== id))
  }

  const selectedGoal = goals.find(g => g.id === selectedId) ?? null

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: C.ink40, fontSize: 'var(--fs-15)' }}>Loading…</div>
  }

  return (
    <div style={{ padding: '0 0 140px' }}>
      {selectedGoal && (
        <EventDetail
          goal={selectedGoal}
          onClose={() => setSelectedId(null)}
          onUpdate={updated => setGoals(prev => prev.map(g => g.id === updated.id ? updated : g))}
        />
      )}

      {week && <WeekCard week={week} />}

      {/* Programs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: week ? 20 : 0 }}>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40 }}>
          ◆ PROGRAMS
        </div>
        {!addingProgram && (
          <button onClick={() => setAddingProgram(true)} style={{
            background: 'none', border: 'none', color: C.teal, fontSize: 'var(--fs-13)',
            fontWeight: 700, cursor: 'pointer', padding: '2px 0',
          }}>
            + Add
          </button>
        )}
      </div>

      {addingProgram && (
        <AddProgramForm
          onSave={p => { setPrograms(prev => [...prev, p]); setAddingProgram(false) }}
          onCancel={() => setAddingProgram(false)}
        />
      )}

      {programs.map(p => (
        <ProgramCard
          key={p.id}
          program={p}
          onAdvance={handleProgramAdvance}
          onRemove={() => handleProgramRemove(p.id)}
        />
      ))}

      {programs.length === 0 && !addingProgram && (
        <div style={{ textAlign: 'center', padding: '12px 0 20px', color: C.ink40, fontSize: 'var(--fs-14)' }}>
          No active programs.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 20 }}>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40 }}>
          ◆ TARGET EVENTS
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{
            background: 'none', border: 'none', color: C.teal, fontSize: 'var(--fs-13)',
            fontWeight: 700, cursor: 'pointer', padding: '2px 0',
          }}>
            + Add Event
          </button>
        )}
      </div>

      {adding && (
        <AddEventForm
          onSave={g => { setGoals(prev => [...prev, g].sort((a, b) => a.event_date.localeCompare(b.event_date))); setAdding(false) }}
          onCancel={() => setAdding(false)}
        />
      )}

      {goals.map(g => <EventCard key={g.id} goal={g} onOpen={() => setSelectedId(g.id)} />)}

      {goals.length === 0 && !adding && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.ink40, fontSize: 'var(--fs-15)' }}>
          No training events set.
        </div>
      )}
    </div>
  )
}
