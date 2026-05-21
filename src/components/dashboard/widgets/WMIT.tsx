import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getMITCadence, type MITCadence, type CategoryFreshness } from '../../../lib/daily-plan'

interface WMITProps { dark?: boolean }

const CAT_LABEL: Record<string, string> = {
  career: 'CAREER',
  family_creative: 'FAMILY',
  home: 'HOME',
  projects: 'PROJECTS',
}

export function WMIT({ dark }: WMITProps) {
  const { user } = useAuth()
  const [data, setData] = useState<MITCadence | null>(null)

  useEffect(() => {
    if (!user) return
    getMITCadence(user.id).then(setData).catch(() => setData(null))
  }, [user])

  const darkCount = data?.freshness.filter(f => f.isDark).length ?? 0

  return (
    <Glass dark={dark} span={4} pad={14}>
      <CardLabel dark={dark}>MIT cadence</CardLabel>
      <div className="mono" style={{
        fontSize: 'var(--fs-22)',
        fontWeight: 700,
        lineHeight: 1,
        color: darkCount > 0 ? C.rust : C.teal,
      }}>
        {darkCount}<span style={{ fontSize: 'var(--fs-12)', opacity: 0.55 }}> dark</span>
      </div>
      <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.55, marginTop: 2 }}>
        cadence-aware · per category
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 10 }}>
        {(data?.freshness ?? []).map(f => <CatRow key={f.category} f={f} dark={dark} />)}
      </div>
    </Glass>
  )
}

function CatRow({ f, dark }: { f: CategoryFreshness; dark?: boolean }) {
  const dim = dark ? 'rgba(245,237,214,0.45)' : 'rgba(26,18,8,0.45)'
  const baseText = dark ? 'rgba(245,237,214,0.85)' : 'rgba(26,18,8,0.85)'
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 6,
    }}>
      <span className="mono" style={{
        fontSize: 'var(--fs-10)', letterSpacing: '0.12em',
        color: f.isDark ? C.rust : baseText,
        fontWeight: 700,
      }}>
        {CAT_LABEL[f.category] ?? f.category.toUpperCase()}
      </span>
      <span className="mono" style={{ fontSize: 'var(--fs-10)', color: f.isDark ? C.rust : dim }}>
        {f.daysSinceLastDone}d · cad {f.cadenceDays}d
      </span>
    </div>
  )
}
