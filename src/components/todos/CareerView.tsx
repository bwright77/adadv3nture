import { useState, useEffect } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import {
  getProjects, getProjectWithMilestones,
  type Project, type ProjectMilestone, type ProjectUpdate, type ProjectContact,
} from '../../lib/projects'
import { ProjectDetail } from './ProjectDetail'

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function CareerCard({ project, primaryContact, onOpen }: {
  project: Project
  primaryContact: ProjectContact | undefined
  onOpen: () => void
}) {
  const softDays = daysUntil(project.soft_deadline_date)
  const hardDays = daysUntil(project.deadline_date)
  const displayDays = softDays ?? hardDays
  const displayDate = project.soft_deadline_date ?? project.deadline_date

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
        background: C.rust, borderRadius: '4px 0 0 4px',
      }} />
      <div style={{
        marginLeft: 4,
        background: '#fff',
        border: `0.5px solid ${C.ink20}`,
        borderLeft: 'none', borderRadius: '0 14px 14px 0',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--fs-17)', fontWeight: 600, color: C.dark, lineHeight: 1.2, marginBottom: 4 }}>
              {project.title}
            </div>
            {primaryContact && (
              <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.rust, letterSpacing: '0.08em', marginBottom: 8 }}>
                {primaryContact.name}{primaryContact.title ? ` · ${primaryContact.title}` : ''}
              </div>
            )}

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40 }}>PROGRESS</span>
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.rust }}>{project.progress_pct}%</span>
              </div>
              <div style={{ height: 4, background: C.ink20, borderRadius: 2 }}>
                <div style={{ height: 4, width: `${project.progress_pct}%`, background: C.rust, borderRadius: 2 }} />
              </div>
            </div>

            {project.next_action && (
              <div style={{ marginTop: 8, fontSize: 'var(--fs-13)', color: C.ink60, lineHeight: 1.4 }}>
                → {project.next_action}
              </div>
            )}
          </div>

          {displayDate && displayDays !== null && displayDays >= 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="badge" style={{ fontSize: 'var(--fs-22)', lineHeight: 1, color: displayDays <= 14 ? C.rust : C.dark }}>
                {displayDays}
              </div>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.1em' }}>DAYS</div>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, marginTop: 1 }}>{formatDate(displayDate)}</div>
            </div>
          )}
        </div>
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

export function CareerView() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [contactsMap, setContactsMap] = useState<Record<string, ProjectContact[]>>({})
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<DetailState | null>(null)

  async function load() {
    if (!user) return
    setLoading(true)
    const p = await getProjects(user.id, 'career').catch(() => [])
    setProjects(p)
    // Fetch primary contact for each project for the card display
    const map: Record<string, ProjectContact[]> = {}
    await Promise.all(p.map(async proj => {
      const { contacts } = await getProjectWithMilestones(proj.id).catch(() => ({ contacts: [] as ProjectContact[], project: proj, milestones: [], updates: [] }))
      map[proj.id] = contacts
    }))
    setContactsMap(map)
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
      <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.ink40, marginBottom: 10 }}>
        ◆ ACTIVE OPPORTUNITIES
      </div>
      {projects.map(p => (
        <CareerCard
          key={p.id}
          project={p}
          primaryContact={contactsMap[p.id]?.[0]}
          onOpen={() => handleOpen(p)}
        />
      ))}
      {projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.ink40, fontSize: 'var(--fs-15)' }}>
          No active opportunities.
        </div>
      )}
    </div>
  )
}
