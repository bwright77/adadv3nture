import { useState, useEffect, useRef } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import {
  getProjects, getProjectWithMilestones, addProject,
  type Project, type ProjectMilestone, type ProjectUpdate, type ProjectContact, type ProjectCategory,
} from '../../lib/projects'
import { ProjectDetail } from './ProjectDetail'
import { daysUntil as daysUntilDate } from '../../lib/countdown'

const CAT_COLOR: Record<string, string> = {
  art:      C.sand,
  software: C.teal,
  home:     '#8B7355',
  career:   C.rust,
  other:    C.ink40,
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return daysUntilDate(dateStr)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const color = CAT_COLOR[project.category] ?? C.rust
  const softDays = daysUntil(project.soft_deadline_date)
  const hardDays = daysUntil(project.deadline_date)
  const displayDays = softDays ?? hardDays
  const displayDate = project.soft_deadline_date ?? project.deadline_date
  const urgent = displayDays !== null && displayDays <= 14

  return (
    <button
      onClick={onOpen}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        position: 'relative', marginBottom: 10, cursor: 'pointer',
        background: 'none', border: 'none', padding: 0, fontFamily: 'inherit',
      }}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: color, borderRadius: '4px 0 0 4px',
      }} />
      <div style={{
        marginLeft: 4,
        background: '#fff',
        border: `0.5px solid ${C.ink20}`,
        borderLeft: 'none', borderRadius: '0 14px 14px 0',
        overflow: 'hidden',
      }}>
        {project.image_url && (
          <div style={{ position: 'relative', height: 72 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${project.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: color }} />
          </div>
        )}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', color, letterSpacing: '0.12em', marginBottom: 3 }}>
              {project.category.toUpperCase()}
            </div>
            <div style={{ fontSize: 'var(--fs-17)', fontWeight: 600, color: C.dark, lineHeight: 1.2, marginBottom: 8 }}>
              {project.title}
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40 }}>PROGRESS</span>
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color }}>{project.progress_pct}%</span>
              </div>
              <div style={{ height: 4, background: C.ink20, borderRadius: 2 }}>
                <div style={{ height: 4, width: `${project.progress_pct}%`, background: color, borderRadius: 2 }} />
              </div>
            </div>

            {/* Next action */}
            {project.next_action && (
              <div style={{ marginTop: 8, fontSize: 'var(--fs-13)', color: C.ink60, lineHeight: 1.4 }}>
                → {project.next_action}
              </div>
            )}
          </div>

          {/* Deadline */}
          {displayDate && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {displayDays !== null && displayDays >= 0 ? (
                <>
                  <div className="badge" style={{ fontSize: 'var(--fs-22)', lineHeight: 1, color: urgent ? C.rust : C.dark }}>
                    {displayDays}
                  </div>
                  <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em' }}>DAYS</div>
                  <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, marginTop: 1 }}>
                    {formatDate(displayDate)}
                  </div>
                  {project.soft_deadline_date && (
                    <div className="mono" style={{ fontSize: 9, color: urgent ? C.rust : C.ink40, marginTop: 1, letterSpacing: '0.08em' }}>SOFT</div>
                  )}
                </>
              ) : (
                <div className="badge" style={{ fontSize: 'var(--fs-13)', color: C.teal }}>DONE</div>
              )}
            </div>
          )}
        </div>{/* end flex row */}
      </div>
    </button>
  )
}

interface DetailState {
  project: Project
  milestones: ProjectMilestone[]
  updates: ProjectUpdate[]
  contacts: ProjectContact[]
}

function AddProjectForm({ onSave, onCancel }: { onSave: (p: Project) => void; onCancel: () => void }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ProjectCategory>('software')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSave() {
    if (!user || !title.trim()) return
    setSaving(true)
    try {
      const p = await addProject(user.id, title.trim(), category, deadline || null)
      onSave(p)
    } catch { setSaving(false) }
  }

  const selectStyle = { border: `1px solid ${C.ink20}`, borderRadius: 8, padding: '7px 10px', fontSize: 'var(--fs-14)', background: '#fff', color: C.dark, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, outline: 'none' }

  return (
    <div style={{ background: '#fff', border: `1.5px solid ${CAT_COLOR[category] ?? C.teal}`, borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
      <div className="mono" style={{ fontSize: 'var(--fs-10)', color: CAT_COLOR[category] ?? C.teal, letterSpacing: '0.12em', marginBottom: 10 }}>NEW PROJECT</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel() }}
          placeholder="Project title"
          style={selectStyle}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <select style={selectStyle} value={category} onChange={e => setCategory(e.target.value as ProjectCategory)}>
            <option value="software">Software</option>
            <option value="art">Art</option>
            <option value="home">Home</option>
            <option value="other">Other</option>
          </select>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={selectStyle} placeholder="Deadline" />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-14)', cursor: 'pointer', padding: '6px 10px' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} style={{ background: CAT_COLOR[category] ?? C.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 'var(--fs-14)', fontWeight: 700, cursor: 'pointer', opacity: !title.trim() ? 0.5 : 1 }}>
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProjectsView() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [adding, setAdding] = useState(false)

  async function load() {
    if (!user) return
    setLoading(true)
    const p = await getProjects(user.id).catch(() => [])
    setProjects(p.filter(proj => proj.category !== 'career'))
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  async function handleOpen(project: Project) {
    const { project: p, milestones, updates, contacts } = await getProjectWithMilestones(project.id)
    setDetail({ project: p, milestones, updates, contacts })
  }

  function handleDetailUpdate() {
    load()
    if (detail) {
      getProjectWithMilestones(detail.project.id).then(({ project, milestones, updates, contacts }) => {
        setDetail({ project, milestones, updates, contacts })
      }).catch(() => null)
    }
  }

  if (detail) {
    return (
      <ProjectDetail
        project={detail.project}
        milestones={detail.milestones}
        updates={detail.updates}
        contacts={detail.contacts}
        onClose={() => setDetail(null)}
        onUpdate={handleDetailUpdate}
      />
    )
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: C.ink40, fontSize: 'var(--fs-15)' }}>Loading…</div>
  }

  return (
    <div style={{ padding: '0 0 140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40 }}>
          ◆ ACTIVE PROJECTS
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} style={{ background: 'none', border: 'none', color: C.teal, fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer', padding: '2px 0' }}>
            + Add
          </button>
        )}
      </div>
      {adding && (
        <AddProjectForm
          onSave={p => { setProjects(prev => [p, ...prev.filter(x => x.category !== 'career')]); setAdding(false) }}
          onCancel={() => setAdding(false)}
        />
      )}
      {projects.map(p => (
        <ProjectCard key={p.id} project={p} onOpen={() => handleOpen(p)} />
      ))}
      {projects.length === 0 && !adding && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.ink40, fontSize: 'var(--fs-15)' }}>
          No active projects.
        </div>
      )}
    </div>
  )
}
