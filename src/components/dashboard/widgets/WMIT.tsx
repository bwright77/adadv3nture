import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getMITStats, type MITStats } from '../../../lib/daily-plan'

interface WMITProps { dark?: boolean }

export function WMIT({ dark }: WMITProps) {
  const { user } = useAuth()
  const [stats, setStats] = useState<MITStats | null>(null)

  useEffect(() => {
    if (!user) return
    getMITStats(user.id).then(setStats).catch(() => setStats(null))
  }, [user])

  const pct = stats ? Math.round(stats.rate7d * 100) : 0
  const delta = stats?.deltaVsPrior ?? 0
  const dots = stats?.last5Days ?? [false, false, false, false, false]
  const deltaSign = delta > 0 ? '↑' : delta < 0 ? '↓' : '·'
  const deltaColor = delta > 0 ? C.teal : delta < 0 ? C.rust : undefined

  return (
    <Glass dark={dark} span={4} pad={14}>
      <CardLabel dark={dark}>MIT · today</CardLabel>
      <div className="mono" style={{ fontSize: 'var(--fs-26)', fontWeight: 700, lineHeight: 1, fontFeatureSettings: '"zero" 0' }}>
        {pct}<span style={{ fontSize: 'var(--fs-14)', opacity: 0.5 }}>%</span>
      </div>
      <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.55, marginTop: 2, color: deltaColor }}>
        {deltaSign}{Math.abs(delta)} vs last wk
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
        {dots.map((v, i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: 2,
            background: v ? C.rust : (dark ? 'rgba(255,255,255,0.18)' : 'rgba(26,18,8,0.12)'),
          }} />
        ))}
      </div>
    </Glass>
  )
}
