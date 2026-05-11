import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { getProjects, type Project } from '../../../lib/projects'
import { useAuth } from '../../../contexts/AuthContext'
import { daysUntil as daysUntilDate } from '../../../lib/countdown'

interface WWAProps { dark?: boolean; onOpenCareer?: () => void }

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return daysUntilDate(dateStr)
}

function DeadlineTag({ days }: { days: number }) {
  const urgent = days <= 7
  const soon = days <= 14
  return (
    <span className="mono" style={{
      fontSize: 'var(--fs-10)', padding: '2px 7px', borderRadius: 999,
      background: urgent ? C.rust : soon ? 'rgba(196,82,42,0.15)' : 'rgba(26,18,8,0.08)',
      color: urgent ? C.cream : soon ? C.rust : C.ink60,
      letterSpacing: '0.1em', flexShrink: 0,
    }}>
      {days}D
    </span>
  )
}

function ProjectRow({ project, dark, border }: { project: Project; dark?: boolean; border?: boolean }) {
  const days = daysUntil(project.soft_deadline_date ?? project.deadline_date)
  return (
    <div style={{
      paddingTop: border ? 10 : 0,
      marginTop: border ? 10 : 0,
      borderTop: border ? `0.5px dashed ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(26,18,8,0.18)'}` : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div className="badge" style={{ fontSize: 'var(--fs-15)', color: dark ? C.cream : C.dark }}>
            {project.title.toUpperCase()}
          </div>
          {project.next_action && (
            <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.6, marginTop: 2, lineHeight: 1.4 }}>
              {project.next_action}
            </div>
          )}
        </div>
        {days !== null && <DeadlineTag days={days} />}
      </div>
    </div>
  )
}

export function WWA({ dark, onOpenCareer }: WWAProps) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    if (!user) return
    getProjects(user.id, 'career').then(setProjects).catch(() => null)
  }, [user])

  const primary = projects[0]
  const rest = projects.slice(1)

  return (
    <Glass dark={dark} span={12} pad={14} onClick={onOpenCareer} style={onOpenCareer ? { cursor: 'pointer' } : undefined}>
      <CardLabel dark={dark}>Wright adventures · career</CardLabel>
      {projects.length === 0 ? (
        <div className="mono" style={{ fontSize: 'var(--fs-13)', opacity: 0.4, marginTop: 6 }}>
          No active projects
        </div>
      ) : (
        <>
          {primary && <ProjectRow project={primary} dark={dark} />}
          {rest.map(p => (
            <ProjectRow key={p.id} project={p} dark={dark} border />
          ))}
        </>
      )}
    </Glass>
  )
}
