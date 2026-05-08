import { useState } from 'react'
import { C } from '../../tokens'
import { toggleMilestone, addUpdate, updateNextAction, updateProjectProgress, type Project, type ProjectMilestone, type ProjectUpdate } from '../../lib/projects'

interface ProjectDetailProps {
  project: Project
  milestones: ProjectMilestone[]
  updates: ProjectUpdate[]
  onClose: () => void
  onUpdate: () => void
}

const CAT_COLOR: Record<string, string> = {
  art:      C.sand,
  software: C.teal,
  home:     '#8B7355',
  career:   C.rust,
  other:    C.ink40,
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

export function ProjectDetail({ project, milestones, updates, onClose, onUpdate }: ProjectDetailProps) {
  const [localMilestones, setLocalMilestones] = useState(milestones)
  const [editingAction, setEditingAction] = useState(false)
  const [actionDraft, setActionDraft] = useState(project.next_action ?? '')
  const [updatesLocal, setUpdatesLocal] = useState(updates)
  const [noteDraft, setNoteDraft] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const color = CAT_COLOR[project.category] ?? C.rust

  const done = localMilestones.filter(m => m.done).length
  const total = localMilestones.length
  const pct = total > 0 ? Math.round((done / total) * 100) : project.progress_pct

  async function handleToggle(m: ProjectMilestone) {
    const updated = { ...m, done: !m.done, done_at: !m.done ? new Date().toISOString() : null }
    setLocalMilestones(prev => prev.map(x => x.id === m.id ? updated : x))
    await toggleMilestone(m.id, !m.done)
    const newPct = Math.round((localMilestones.filter(x => x.id === m.id ? !m.done : x.done).length / total) * 100)
    await updateProjectProgress(project.id, newPct)
    onUpdate()
  }

  async function handleSaveAction() {
    if (!actionDraft.trim()) { setEditingAction(false); return }
    await updateNextAction(project.id, actionDraft.trim())
    setEditingAction(false)
    onUpdate()
  }

  async function handleAddNote() {
    if (!noteDraft.trim()) { setAddingNote(false); return }
    const update = await addUpdate(project.id, noteDraft.trim())
    setUpdatesLocal(prev => [update, ...prev])
    setNoteDraft('')
    setAddingNote(false)
    onUpdate()
  }

  const softDays = daysUntil(project.soft_deadline_date)
  const hardDays = daysUntil(project.deadline_date)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: C.paper, overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ background: C.dark, padding: '56px 18px 20px', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, left: 14,
            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
            color: C.cream, fontSize: 'var(--fs-20)', cursor: 'pointer',
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >←</button>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color, letterSpacing: '0.15em', marginBottom: 4 }}>
          {project.category.toUpperCase()}
        </div>
        <div className="badge" style={{ fontSize: 'var(--fs-28)', color: C.cream, lineHeight: 1, letterSpacing: '0.01em' }}>
          {project.title.toUpperCase()}
        </div>
        {project.description && (
          <div style={{ fontSize: 'var(--fs-13)', color: 'rgba(245,237,214,0.6)', marginTop: 6, lineHeight: 1.5 }}>
            {project.description}
          </div>
        )}

        {/* Deadline chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {softDays !== null && (
            <div style={{
              padding: '4px 10px', borderRadius: 999,
              background: softDays <= 14 ? 'rgba(196,82,42,0.25)' : 'rgba(255,255,255,0.1)',
              border: softDays <= 14 ? `1px solid ${C.rust}` : '1px solid rgba(255,255,255,0.15)',
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              <span className="mono" style={{ fontSize: 'var(--fs-10)', color: 'rgba(245,237,214,0.55)', letterSpacing: '0.1em' }}>SOFT</span>
              <span className="badge" style={{ fontSize: 'var(--fs-13)', color: softDays <= 14 ? C.rust : C.cream }}>
                {formatDate(project.soft_deadline_date!)} · {softDays}D
              </span>
            </div>
          )}
          {hardDays !== null && (
            <div style={{
              padding: '4px 10px', borderRadius: 999,
              background: hardDays <= 7 ? 'rgba(196,82,42,0.35)' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              <span className="mono" style={{ fontSize: 'var(--fs-10)', color: 'rgba(245,237,214,0.55)', letterSpacing: '0.1em' }}>DEADLINE</span>
              <span className="badge" style={{ fontSize: 'var(--fs-13)', color: C.cream }}>
                {formatDate(project.deadline_date!)} · {hardDays}D
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 20, background: `linear-gradient(180deg, ${C.dark} 0%, ${C.paper} 100%)` }} />

      <div style={{ padding: '0 16px 140px' }}>

        {/* Progress */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em' }}>PROGRESS</span>
            <span className="badge" style={{ fontSize: 'var(--fs-16)', color }}>
              {done}/{total} · {pct}%
            </span>
          </div>
          <div style={{ height: 6, background: C.ink20, borderRadius: 3 }}>
            <div style={{ height: 6, width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Next action */}
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40, marginBottom: 8 }}>
            ● NEXT ACTION
          </div>
          {editingAction ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fff', border: `1.5px solid ${color}`, borderRadius: 12, padding: '8px 12px' }}>
              <input
                autoFocus
                value={actionDraft}
                onChange={e => setActionDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveAction(); if (e.key === 'Escape') setEditingAction(false) }}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 'var(--fs-15)', background: 'transparent', fontFamily: 'inherit' }}
              />
              <button onClick={handleSaveAction} style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditingAction(false)} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-16)', cursor: 'pointer' }}>×</button>
            </div>
          ) : (
            <button
              onClick={() => { setEditingAction(true); setActionDraft(project.next_action ?? '') }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: `${color}10`, border: `0.5px solid ${color}30`,
                borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                fontSize: 'var(--fs-15)', color: C.dark, lineHeight: 1.4,
                fontFamily: 'inherit',
              }}
            >
              {project.next_action ?? <span style={{ color: C.ink40 }}>Add next action…</span>}
            </button>
          )}
        </div>

        {/* Milestones */}
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40, marginBottom: 10 }}>
            ◆ MILESTONES
          </div>
          {localMilestones.map(m => (
            <button
              key={m.id}
              onClick={() => handleToggle(m)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                background: m.done ? 'transparent' : '#fff',
                border: `0.5px solid ${m.done ? C.ink20 : C.ink20}`,
                borderRadius: 12, padding: '11px 14px', cursor: 'pointer',
                marginBottom: 6, textAlign: 'left', fontFamily: 'inherit',
                opacity: m.done ? 0.5 : 1, transition: 'opacity 0.2s',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                border: m.done ? 'none' : `2px solid ${color}`,
                background: m.done ? color : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {m.done && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{
                flex: 1, fontSize: 'var(--fs-15)', color: C.dark, lineHeight: 1.4,
                textDecoration: m.done ? 'line-through' : 'none',
              }}>
                {m.title}
              </span>
            </button>
          ))}
        </div>

        {/* Updates */}
        <div>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40, marginBottom: 10 }}>
            ○ UPDATES
          </div>
          {addingNote ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fff', border: `1.5px solid ${color}`, borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
              <textarea
                autoFocus
                value={noteDraft}
                onChange={e => setNoteDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote() } if (e.key === 'Escape') setAddingNote(false) }}
                placeholder="Log an update…"
                rows={2}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 'var(--fs-14)', background: 'transparent', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={handleAddNote} style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer' }}>Add</button>
                <button onClick={() => setAddingNote(false)} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-16)', cursor: 'pointer' }}>×</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingNote(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 12,
                border: `1px dashed ${C.ink20}`, background: 'transparent',
                color: C.ink60, fontSize: 'var(--fs-14)', cursor: 'pointer', width: '100%',
                fontFamily: 'inherit', marginBottom: 8,
              }}
            >
              <span style={{ color, fontSize: 'var(--fs-16)' }}>+</span> Log an update
            </button>
          )}
          {updatesLocal.map(u => (
            <div key={u.id} style={{
              background: '#fff', border: `0.5px solid ${C.ink20}`, borderRadius: 12,
              padding: '10px 14px', marginBottom: 6,
            }}>
              <div style={{ fontSize: 'var(--fs-14)', color: C.dark, lineHeight: 1.5, marginBottom: 4 }}>{u.note}</div>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40 }}>
                {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
