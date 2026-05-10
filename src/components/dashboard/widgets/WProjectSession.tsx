import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getProjects } from '../../../lib/projects'
import { supabase } from '../../../lib/supabase'
import type { Project, ProjectMilestone } from '../../../lib/projects'

interface Props { dark?: boolean }

function hoursBeforeDinner(): number {
  const now = new Date()
  const dinnerHour = 18 // 6pm
  const totalMins = (dinnerHour * 60) - (now.getHours() * 60 + now.getMinutes())
  return Math.max(0, Math.round(totalMins / 60 * 10) / 10)
}

function formatHours(h: number): string {
  if (h <= 0) return 'evening now'
  const whole = Math.floor(h)
  const mins = Math.round((h - whole) * 60)
  if (mins === 0) return `${whole}h before dinner`
  return `${whole}h ${mins}m before dinner`
}

const CAT_ICON: Record<string, string> = {
  art: '🎨', software: '💻', home: '🏠', other: '✦', career: '💼',
}

export function WProjectSession({ dark }: Props) {
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [nextMilestone, setNextMilestone] = useState<ProjectMilestone | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getProjects(user.id)
      .then(async projects => {
        // Prefer non-career projects with a next_action set, lowest progress first
        const candidates = projects
          .filter(p => p.category !== 'career' && p.status === 'active')
          .sort((a, b) => (a.progress_pct ?? 0) - (b.progress_pct ?? 0))

        const pick = candidates[0] ?? null
        setProject(pick)

        if (pick) {
          const { data } = await (supabase as any)
            .from('project_milestones')
            .select('*')
            .eq('project_id', pick.id)
            .eq('done', false)
            .order('sort_order', { ascending: true })
            .limit(1)
            .maybeSingle()
          setNextMilestone(data ?? null)
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [user])

  const subColor = dark ? 'rgba(245,237,214,0.55)' : C.ink60
  const hours = hoursBeforeDinner()

  return (
    <Glass dark={dark} span={12} pad={16}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, background: C.rust, borderRadius: 1 }} />
          <span className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.14em', color: subColor }}>
            PROJECT SESSION
          </span>
        </div>
        <span className="mono" style={{ fontSize: 'var(--fs-10)', color: subColor, opacity: 0.7 }}>
          {formatHours(hours)}
        </span>
      </div>

      {loading ? (
        <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.4 }}>Loading…</div>
      ) : !project ? (
        <div className="mono" style={{ fontSize: 'var(--fs-13)', opacity: 0.4 }}>
          No active projects — add one in Projects tab.
        </div>
      ) : (
        <div>
          {/* Project name + category */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{CAT_ICON[project.category] ?? '✦'}</span>
            <span className="badge" style={{
              fontSize: 'var(--fs-18)', lineHeight: 1, color: dark ? C.cream : C.dark,
            }}>
              {project.title}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 4, borderRadius: 2,
            background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,18,8,0.08)',
            marginBottom: 6, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${project.progress_pct ?? 0}%`,
              background: C.rust, borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div className="mono" style={{ fontSize: 'var(--fs-11)', color: subColor, marginBottom: 10 }}>
            {project.progress_pct ?? 0}% complete
          </div>

          {/* Next step */}
          {(nextMilestone || project.next_action) && (
            <div style={{
              borderLeft: `2px solid ${C.rust}`, paddingLeft: 10,
            }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: '0.1em', opacity: 0.45, marginBottom: 3 }}>
                NEXT
              </div>
              <div className="badge" style={{ fontSize: 'var(--fs-13)', color: dark ? C.cream : C.dark }}>
                {nextMilestone?.title ?? project.next_action}
              </div>
            </div>
          )}
        </div>
      )}
    </Glass>
  )
}
