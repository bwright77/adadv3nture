import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'
import { getFamilyMembers, type FamilyMember } from '../../../lib/family'

interface Props { dark?: boolean }

interface Spot {
  id: string
  name: string
  type: string
  location: string | null
  drive_minutes: number | null
  notes: string | null
  age_min: number
}

const TYPE_ICON: Record<string, string> = {
  trail: '🥾', park: '🌳', ski: '⛷', bike: '🚴', family: '👨‍👩‍👧', run: '🏃',
}

export function WFamilyDay({ dark }: Props) {
  const { user } = useAuth()
  const [kids, setKids] = useState<FamilyMember[]>([])
  const [spots, setSpots] = useState<Spot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getFamilyMembers(user.id)
      .then(rows => setKids(rows.filter(r => r.role === 'child')))
      .catch(() => setKids([]))
    ;(supabase as any)
      .from('weekend_spots')
      .select('id, name, type, location, drive_minutes, notes, age_min')
      .eq('user_id', user.id)
      .lte('age_min', 5)
      .order('drive_minutes', { ascending: true })
      .limit(3)
      .then(({ data }: { data: Spot[] | null }) => {
        setSpots(data ?? [])
        setLoading(false)
      })
  }, [user])

  const subColor = dark ? 'rgba(245,237,214,0.55)' : C.ink60
  const divider = dark ? 'rgba(255,255,255,0.07)' : 'rgba(26,18,8,0.07)'

  return (
    <Glass dark={dark} span={12} pad={16}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span style={{ width: 5, height: 5, background: C.rust, borderRadius: 1 }} />
        <span className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.14em', color: subColor }}>
          FAMILY DAY
        </span>
      </div>

      {/* Kids row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: spots.length > 0 ? 14 : 0 }}>
        {kids.map(k => (
          <div key={k.id} style={{
            flex: 1, padding: '8px 10px', borderRadius: 12,
            background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(26,18,8,0.04)',
            border: `1px solid ${divider}`,
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{k.emoji ?? '👶'}</div>
            <div className="badge" style={{ fontSize: 'var(--fs-13)', marginBottom: 2 }}>{k.name}</div>
            {k.vibe && (
              <div className="mono" style={{ fontSize: 9, color: subColor, lineHeight: 1.4, opacity: 0.8 }}>
                {k.vibe}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Spots */}
      {!loading && spots.length > 0 && (
        <>
          <div className="mono" style={{
            fontSize: 9, letterSpacing: '0.1em', opacity: 0.4, marginBottom: 8,
            color: dark ? C.cream : C.dark,
          }}>
            SPOTS · ALL THREE CAN DO IT
          </div>
          {spots.map((s, i) => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: 8, marginBottom: 8,
              borderBottom: i < spots.length - 1 ? `1px solid ${divider}` : 'none',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                {TYPE_ICON[s.type] ?? '📍'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="badge" style={{ fontSize: 'var(--fs-13)', color: dark ? C.cream : C.dark }}>
                  {s.name}
                </div>
                <div className="mono" style={{ fontSize: 'var(--fs-11)', color: subColor, marginTop: 2 }}>
                  {[s.location, s.drive_minutes ? `${s.drive_minutes} min` : null].filter(Boolean).join(' · ')}
                </div>
                {s.notes && (
                  <div className="mono" style={{ fontSize: 'var(--fs-11)', color: subColor, opacity: 0.7, marginTop: 2 }}>
                    {s.notes.split('.')[0]}.
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </Glass>
  )
}
