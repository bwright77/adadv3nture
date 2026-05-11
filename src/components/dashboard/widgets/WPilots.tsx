import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getReviewHistory, type PilotLights } from '../../../lib/daily-plan'
import { getRecentActivities } from '../../../lib/strava'
import { logicalToday } from '../../../lib/utils'
import type { Database } from '../../../types/database'

type Activity = Database['public']['Tables']['activities']['Row']
type ListTab = 'training' | 'career' | 'family' | 'home' | 'projects'

interface WPilotsProps {
  dark?: boolean
  onNavigate?: (tab: ListTab) => void
}

const PILOT_DEFS: { key: keyof PilotLights | 'body'; label: string; tab: ListTab }[] = [
  { key: 'body',            label: 'BODY',     tab: 'training' },
  { key: 'career',          label: 'CAREER',   tab: 'career' },
  { key: 'family_creative', label: 'FAMILY',   tab: 'family' },
  { key: 'home',            label: 'HOME',     tab: 'home' },
  { key: 'projects',        label: 'PROJECTS', tab: 'projects' },
]

function staleDaysToV(days: number): number {
  if (days === 0) return 1.0
  if (days === 1) return 0.78
  if (days === 2) return 0.45
  if (days === 3) return 0.2
  return 0.08
}

function staleDaysLabel(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

export function WPilots({ dark, onNavigate }: WPilotsProps) {
  const { user } = useAuth()
  const [pilots, setPilots] = useState<PilotLights | null>(null)
  const [bodyStale, setBodyStale] = useState<number>(7)

  useEffect(() => {
    if (!user) return
    const today = logicalToday()
    Promise.all([
      getReviewHistory(user.id),
      getRecentActivities(user.id, 7),
    ]).then(([history, acts]) => {
      setPilots(history.pilotLights)
      // Find most recent activity and count days since
      const latestAct = (acts as Activity[]).find(a => a.activity_date <= today)
      if (latestAct) {
        const actDate = new Date(latestAct.activity_date + 'T12:00:00')
        const todayDate = new Date(today + 'T12:00:00')
        const diffMs = todayDate.getTime() - actDate.getTime()
        setBodyStale(Math.round(diffMs / 86_400_000))
      }
    }).catch(() => null)
  }, [user])

  return (
    <Glass dark={dark} span={12} pad={14}>
      <CardLabel dark={dark}>Pilot lights · keep them all lit</CardLabel>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {PILOT_DEFS.map(def => {
          const days = def.key === 'body'
            ? bodyStale
            : pilots ? pilots[def.key as keyof PilotLights] : 7
          const v = staleDaysToV(days)
          const label = staleDaysLabel(days)

          return (
            <button
              key={def.key}
              onClick={() => onNavigate?.(def.tab)}
              style={{
                textAlign: 'center', flex: 1, background: 'none', border: 'none',
                cursor: onNavigate ? 'pointer' : 'default', padding: '4px 0',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ width: 22, height: 28, margin: '0 auto', position: 'relative' }}>
                <svg viewBox="0 0 24 32" width="22" height="28">
                  <path
                    d="M12 2 C 16 8, 20 12, 20 20 C 20 26, 16 30, 12 30 C 8 30, 4 26, 4 20 C 4 12, 8 8, 12 2 Z"
                    fill={v > 0.6 ? C.rust : v > 0.3 ? C.sand : 'rgba(150,130,100,0.4)'}
                    opacity={0.4 + v * 0.6}
                  />
                  <path
                    d="M12 8 C 14 12, 16 14, 16 19 C 16 23, 14 26, 12 26 C 10 26, 8 23, 8 19 C 8 14, 10 12, 12 8 Z"
                    fill={v > 0.6 ? '#FFD27A' : '#E8C99A'}
                    opacity={v > 0.3 ? 1 : 0.3}
                  />
                </svg>
              </div>
              <div className="badge" style={{ fontSize: 'var(--fs-11)', marginTop: 2, color: dark ? C.cream : C.dark }}>{def.label}</div>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.55, color: dark ? C.cream : C.dark }}>{label}</div>
            </button>
          )
        })}
      </div>
    </Glass>
  )
}
