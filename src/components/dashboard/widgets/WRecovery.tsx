import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { Ring } from '../../ui/Ring'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { loadRecovery, type RecoveryResult } from '../../../lib/recovery'

interface WRecoveryProps { dark?: boolean }

const TIER_COLOR: Record<string, string> = {
  go_hard:  C.teal,
  moderate: C.sand,
  recovery: C.rust,
  unknown:  C.ink40,
}

const TIER_LABEL: Record<string, string> = {
  go_hard:  'GO HARD',
  moderate: 'MODERATE',
  recovery: 'RECOVERY',
  unknown:  'NO DATA',
}

export function WRecovery({ dark }: WRecoveryProps) {
  const { user } = useAuth()
  const [result, setResult] = useState<RecoveryResult | null>(null)

  useEffect(() => {
    if (!user) return
    loadRecovery(user.id).then(setResult).catch(() => null)
  }, [user])

  const score = result?.score ?? 0
  const tier = result?.tier ?? 'unknown'
  const color = TIER_COLOR[tier]
  const rhr = result?.inputs.rhr
  const sleep = result?.inputs.sleep_duration_hours
  const conf = result?.confidence ?? '—'

  return (
    <Glass dark={dark} span={5} pad={14}>
      <CardLabel dark={dark}>Recovery</CardLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <Ring pct={score} color={result ? color : C.ink20} label={result ? String(score) : '—'} dark={dark} size={54} />
        <div>
          <div className="badge" style={{ fontSize: 'var(--fs-15)', color: result ? color : C.ink40 }}>
            {TIER_LABEL[tier]}
          </div>
          <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.6, marginTop: 2 }}>
            {rhr ? `RHR ${rhr}` : 'no RHR'} · {sleep != null ? `sleep ${Math.round(sleep * 10) / 10}h` : 'no sleep'}
          </div>
          <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.6 }}>
            conf · {conf}
          </div>
        </div>
      </div>
    </Glass>
  )
}
