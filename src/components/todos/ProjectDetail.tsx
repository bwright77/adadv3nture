import { useState, useRef } from 'react'
import { C } from '../../tokens'
import {
  toggleMilestone, addUpdate, updateNextAction, updateProjectProgress,
  addMilestone, deleteMilestone, reorderMilestones,
  addContact, deleteContact, updateProjectImageUrl, updateProjectWebsiteUrl,
  type Project, type ProjectMilestone, type ProjectUpdate, type ProjectContact,
} from '../../lib/projects'

interface ProjectDetailProps {
  project: Project
  milestones: ProjectMilestone[]
  updates: ProjectUpdate[]
  contacts: ProjectContact[]
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

export function ProjectDetail({ project, milestones, updates, contacts, onClose, onUpdate }: ProjectDetailProps) {
  const [localMilestones, setLocalMilestones] = useState(milestones)
  const [localContacts, setLocalContacts] = useState(contacts)
  const [editingAction, setEditingAction] = useState(false)
  const [actionDraft, setActionDraft] = useState(project.next_action ?? '')
  const [localNextAction, setLocalNextAction] = useState(project.next_action ?? '')
  const [updatesLocal, setUpdatesLocal] = useState(updates)
  const [noteDraft, setNoteDraft] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [milestoneDraft, setMilestoneDraft] = useState('')
  const [addingContact, setAddingContact] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactTitle, setContactTitle] = useState('')
  const [contactRelationship, setContactRelationship] = useState('')
  const [editingImage, setEditingImage] = useState(false)
  const [imageDraft, setImageDraft] = useState(project.image_url ?? '')
  const [editingUrl, setEditingUrl] = useState(false)
  const [urlDraft, setUrlDraft] = useState(project.website_url ?? '')

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const dragStartY = useRef(0)
  const rowHeight = useRef(52)

  const color = CAT_COLOR[project.category] ?? C.rust

  const done = localMilestones.filter(m => m.done).length
  const total = localMilestones.length
  const pct = total > 0 ? Math.round((done / total) * 100) : project.progress_pct

  async function recalcProgress(updated: ProjectMilestone[]) {
    const d = updated.filter(m => m.done).length
    const t = updated.length
    const p = t > 0 ? Math.round((d / t) * 100) : 0
    await updateProjectProgress(project.id, p)
    onUpdate()
  }

  async function handleToggle(m: ProjectMilestone) {
    const updated = localMilestones.map(x =>
      x.id === m.id ? { ...x, done: !m.done, done_at: !m.done ? new Date().toISOString() : null } : x
    )
    setLocalMilestones(updated)
    await toggleMilestone(m.id, !m.done)
    await recalcProgress(updated)
    // Auto-advance next_action to first remaining incomplete milestone
    if (!m.done) {
      const next = updated
        .filter(x => !x.done)
        .sort((a, b) => a.sort_order - b.sort_order)[0]
      if (next) {
        setLocalNextAction(next.title)
        setActionDraft(next.title)
        await updateNextAction(project.id, next.title)
      }
    }
  }

  async function handleDeleteMilestone(id: string) {
    const updated = localMilestones.filter(m => m.id !== id)
    setLocalMilestones(updated)
    await deleteMilestone(id)
    await recalcProgress(updated)
  }

  async function handleAddMilestone() {
    if (!milestoneDraft.trim()) { setAddingMilestone(false); return }
    const nextOrder = localMilestones.length > 0
      ? Math.max(...localMilestones.map(m => m.sort_order)) + 1
      : 0
    const m = await addMilestone(project.id, milestoneDraft.trim(), nextOrder)
    const updated = [...localMilestones, m]
    setLocalMilestones(updated)
    setMilestoneDraft('')
    setAddingMilestone(false)
    await recalcProgress(updated)
  }

  // Drag handlers — items swap as pointer passes midpoint
  function onDragStart(e: React.PointerEvent<HTMLDivElement>, idx: number) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragIdx(idx)
    dragStartY.current = e.clientY
    const h = e.currentTarget.closest('[data-row]')?.getBoundingClientRect().height
    if (h) rowHeight.current = h
  }

  function onDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragIdx === null) return
    const dy = e.clientY - dragStartY.current
    const steps = Math.round(dy / rowHeight.current)
    if (steps === 0) return
    const newIdx = Math.max(0, Math.min(localMilestones.length - 1, dragIdx + steps))
    if (newIdx !== dragIdx) {
      const items = [...localMilestones]
      const [item] = items.splice(dragIdx, 1)
      items.splice(newIdx, 0, item)
      setLocalMilestones(items)
      setDragIdx(newIdx)
      dragStartY.current = e.clientY
    }
  }

  function onDragEnd() {
    if (dragIdx === null) return
    setDragIdx(null)
    reorderMilestones(localMilestones.map((m, i) => ({ id: m.id, sort_order: i }))).catch(() => null)
  }

  async function handleAddContact() {
    if (!contactName.trim()) { setAddingContact(false); return }
    const c = await addContact(project.id, contactName.trim(), contactTitle.trim() || undefined, contactRelationship.trim() || undefined)
    setLocalContacts(prev => [...prev, c])
    setContactName(''); setContactTitle(''); setContactRelationship('')
    setAddingContact(false)
    onUpdate()
  }

  async function handleDeleteContact(id: string) {
    setLocalContacts(prev => prev.filter(c => c.id !== id))
    await deleteContact(id)
    onUpdate()
  }

  async function handleSaveImage() {
    await updateProjectImageUrl(project.id, imageDraft)
    onUpdate()
    setEditingImage(false)
  }

  async function handleSaveUrl() {
    await updateProjectWebsiteUrl(project.id, urlDraft)
    onUpdate()
    setEditingUrl(false)
  }

  async function handleSaveAction() {
    if (!actionDraft.trim()) { setEditingAction(false); return }
    await updateNextAction(project.id, actionDraft.trim())
    setLocalNextAction(actionDraft.trim())
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
      <div style={{ background: project.image_url ? 'transparent' : C.dark, padding: 'calc(env(safe-area-inset-top, 0px) + 56px) 18px 20px', position: 'relative', minHeight: project.image_url ? 200 : 'auto' }}>
        {project.image_url && (
          <>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${project.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.75) 100%)' }} />
          </>
        )}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 14px)', left: 14, zIndex: 1,
            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
            color: C.cream, fontSize: 'var(--fs-20)', cursor: 'pointer',
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >←</button>
        <div style={{ position: 'relative', zIndex: 1 }}>
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

          {/* Image URL editor */}
          {editingImage ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <input
                autoFocus
                value={imageDraft}
                onChange={e => setImageDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveImage(); if (e.key === 'Escape') setEditingImage(false) }}
                placeholder="Image URL…"
                style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8, padding: '5px 10px', color: '#fff', fontSize: 'var(--fs-13)', outline: 'none', fontFamily: 'inherit', minWidth: 0 }}
              />
              <button onClick={handleSaveImage} style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 'var(--fs-12)', fontWeight: 700, cursor: 'pointer' }}>Set</button>
              <button onClick={() => setEditingImage(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '5px 10px', color: '#fff', fontSize: 'var(--fs-13)', cursor: 'pointer' }}>×</button>
            </div>
          ) : (
            <button onClick={() => { setEditingImage(true); setImageDraft(project.image_url ?? '') }} style={{ marginTop: 10, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.7)', fontSize: 'var(--fs-11)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {project.image_url ? '⬛ Edit image' : '+ Add image'}
            </button>
          )}
        </div>
      </div>

      <div style={{ height: 20, background: `linear-gradient(180deg, ${C.dark} 0%, ${C.paper} 100%)` }} />

      <div style={{ padding: '0 16px 140px' }}>

        {/* Website URL */}
        {editingUrl ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              autoFocus
              value={urlDraft}
              onChange={e => setUrlDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveUrl(); if (e.key === 'Escape') setEditingUrl(false) }}
              placeholder="https://…"
              style={{ flex: 1, border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '8px 12px', fontSize: 'var(--fs-14)', fontFamily: 'inherit', outline: 'none', minWidth: 0 }}
            />
            <button onClick={handleSaveUrl} style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer' }}>Set</button>
            <button onClick={() => setEditingUrl(false)} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-18)', cursor: 'pointer' }}>×</button>
          </div>
        ) : project.website_url ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <a href={project.website_url} target="_blank" rel="noopener noreferrer" style={{
              flex: 1, display: 'block', background: color, color: '#fff',
              borderRadius: 10, padding: '10px 16px', fontSize: 'var(--fs-14)', fontWeight: 700,
              textDecoration: 'none', textAlign: 'center',
            }}>
              Visit website ↗
            </a>
            <button onClick={() => { setEditingUrl(true); setUrlDraft(project.website_url ?? '') }} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-12)', cursor: 'pointer', padding: '4px 2px', fontFamily: 'inherit' }}>edit</button>
          </div>
        ) : (
          <button onClick={() => setEditingUrl(true)} style={{
            display: 'block', width: '100%', marginBottom: 16,
            background: 'none', border: `1px dashed ${C.ink20}`, borderRadius: 10,
            padding: '10px 16px', color: C.ink40, fontSize: 'var(--fs-14)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            + Add website
          </button>
        )}

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

        {/* Contacts */}
        {(localContacts.length > 0 || project.category === 'career') && (
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40, marginBottom: 8 }}>
              ◆ CONTACTS
            </div>
            {localContacts.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
                background: '#fff', border: `0.5px solid ${C.ink20}`, borderRadius: 12,
                padding: '10px 14px', marginBottom: 6,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--fs-15)', fontWeight: 600, color: C.dark }}>{c.name}</div>
                  {c.title && <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink60, marginTop: 2 }}>{c.title}</div>}
                  {c.relationship_note && <div style={{ fontSize: 'var(--fs-12)', color: C.ink40, marginTop: 3, fontStyle: 'italic' }}>{c.relationship_note}</div>}
                </div>
                <button onClick={() => handleDeleteContact(c.id)} style={{ background: 'none', border: 'none', color: C.ink20, fontSize: 'var(--fs-17)', cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>×</button>
              </div>
            ))}
            {addingContact ? (
              <div style={{ background: '#fff', border: `1.5px solid ${color}`, borderRadius: 12, padding: '10px 12px', marginTop: 4 }}>
                <input
                  autoFocus
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Name *"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: 'var(--fs-15)', fontFamily: 'inherit', marginBottom: 6, background: 'transparent' }}
                />
                <input
                  value={contactTitle}
                  onChange={e => setContactTitle(e.target.value)}
                  placeholder="Title / org"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: 'var(--fs-13)', fontFamily: 'inherit', marginBottom: 6, background: 'transparent', color: C.ink60 }}
                />
                <input
                  value={contactRelationship}
                  onChange={e => setContactRelationship(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddContact(); if (e.key === 'Escape') { setAddingContact(false) } }}
                  placeholder="Relationship note"
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: 'var(--fs-13)', fontFamily: 'inherit', marginBottom: 8, background: 'transparent', color: C.ink60 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleAddContact} style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer' }}>Add</button>
                  <button onClick={() => { setAddingContact(false); setContactName(''); setContactTitle(''); setContactRelationship('') }} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-16)', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingContact(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 12, marginTop: 4,
                  border: `1px dashed ${C.ink20}`, background: 'transparent',
                  color: C.ink60, fontSize: 'var(--fs-14)', cursor: 'pointer', width: '100%',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ color, fontSize: 'var(--fs-16)' }}>+</span> Add contact
              </button>
            )}
          </div>
        )}

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
              onClick={() => { setEditingAction(true); setActionDraft(localNextAction) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: `${color}10`, border: `0.5px solid ${color}30`,
                borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                fontSize: 'var(--fs-15)', color: C.dark, lineHeight: 1.4,
                fontFamily: 'inherit',
              }}
            >
              {localNextAction || <span style={{ color: C.ink40 }}>Add next action…</span>}
            </button>
          )}
        </div>

        {/* Milestones */}
        <div style={{ marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40, marginBottom: 10 }}>
            ◆ MILESTONES
          </div>

          {localMilestones.map((m, i) => (
            <div
              key={m.id}
              data-row="true"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: dragIdx === i ? '#fff' : (m.done ? 'transparent' : '#fff'),
                border: `0.5px solid ${dragIdx === i ? color : C.ink20}`,
                borderRadius: 12, padding: '11px 10px 11px 6px',
                marginBottom: 6,
                opacity: m.done && dragIdx !== i ? 0.5 : 1,
                transition: 'opacity 0.2s, border-color 0.15s',
                boxShadow: dragIdx === i ? '0 6px 20px rgba(0,0,0,0.12)' : 'none',
                transform: dragIdx === i ? 'scale(1.01)' : 'scale(1)',
                zIndex: dragIdx === i ? 5 : 0,
                position: 'relative',
                touchAction: 'none',
              }}
            >
              {/* Drag handle */}
              <div
                onPointerDown={e => onDragStart(e, i)}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
                style={{
                  padding: '4px 6px', cursor: 'grab', flexShrink: 0,
                  color: C.ink20, fontSize: 12, lineHeight: 1,
                  display: 'flex', flexDirection: 'column', gap: 3,
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', gap: 2 }}>
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor' }} />
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor' }} />
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor' }} />
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor' }} />
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor' }} />
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor' }} />
                </div>
              </div>

              {/* Checkbox */}
              <button
                onClick={() => handleToggle(m)}
                style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  border: m.done ? 'none' : `2px solid ${color}`,
                  background: m.done ? color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {m.done && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
              </button>

              {/* Title */}
              <span style={{
                flex: 1, fontSize: 'var(--fs-15)', color: C.dark, lineHeight: 1.4,
                textDecoration: m.done ? 'line-through' : 'none',
              }}>
                {m.title}
              </span>

              {/* Delete */}
              <button
                onClick={() => handleDeleteMilestone(m.id)}
                style={{ background: 'none', border: 'none', color: C.ink20, fontSize: 'var(--fs-17)', cursor: 'pointer', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
              >×</button>
            </div>
          ))}

          {/* Add milestone */}
          {addingMilestone ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fff', border: `1.5px solid ${color}`, borderRadius: 12, padding: '8px 12px', marginTop: 4 }}>
              <input
                autoFocus
                value={milestoneDraft}
                onChange={e => setMilestoneDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddMilestone(); if (e.key === 'Escape') { setAddingMilestone(false); setMilestoneDraft('') } }}
                placeholder="New milestone…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 'var(--fs-15)', background: 'transparent', fontFamily: 'inherit' }}
              />
              <button onClick={handleAddMilestone} style={{ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer' }}>Add</button>
              <button onClick={() => { setAddingMilestone(false); setMilestoneDraft('') }} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-16)', cursor: 'pointer' }}>×</button>
            </div>
          ) : (
            <button
              onClick={() => setAddingMilestone(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 12, marginTop: 4,
                border: `1px dashed ${C.ink20}`, background: 'transparent',
                color: C.ink60, fontSize: 'var(--fs-14)', cursor: 'pointer', width: '100%',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ color, fontSize: 'var(--fs-16)' }}>+</span> Add milestone
            </button>
          )}
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
