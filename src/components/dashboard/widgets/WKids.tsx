import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { useAuth } from '../../../contexts/AuthContext'
import { getFamilyMembers, ageDecimal, type FamilyMember } from '../../../lib/family'

interface WKidsProps { dark?: boolean }

export function WKids({ dark }: WKidsProps) {
  const { user } = useAuth()
  const [kids, setKids] = useState<FamilyMember[]>([])

  useEffect(() => {
    if (!user) return
    getFamilyMembers(user.id)
      .then(rows => setKids(rows.filter(r => r.role === 'child')))
      .catch(() => setKids([]))
  }, [user])

  return (
    <Glass dark={dark} span={12} pad={14}>
      <CardLabel dark={dark}>Kids home · 3:45</CardLabel>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        {kids.map(k => {
          const note = (k.vibe ?? '').split('·')[0]?.trim() || ''
          return (
            <div key={k.id} style={{
              flex: 1, padding: 8, borderRadius: 12,
              background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(26,18,8,0.04)',
            }}>
              <div className="badge" style={{ fontSize: 'var(--fs-13)' }}>{k.name}</div>
              <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.55 }}>
                {ageDecimal(k.birthday)}y{note ? ` · ${note}` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </Glass>
  )
}
