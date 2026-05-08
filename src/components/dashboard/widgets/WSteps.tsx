import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { Spark } from '../../ui/Spark'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getLast7DaysSteps } from '../../../lib/recovery'

const GOAL = 10_000

interface WStepsProps { dark?: boolean }

function formatSteps(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export function WSteps({ dark }: WStepsProps) {
  const { user } = useAuth()
  const [days, setDays] = useState<{ date: string; count: number | null }[]>([])

  useEffect(() => {
    if (!user) return
    getLast7DaysSteps(user.id).then(setDays).catch(() => null)
  }, [user])

  const latest = days.findLast(d => d.count !== null) ?? null
  const yesterday = latest?.count ?? null
  const sparkData = days.map(d => d.count ?? 0)
  const hasData = days.some(d => d.count !== null)

  const onTrack = yesterday !== null && yesterday >= GOAL
  const close    = yesterday !== null && yesterday >= 7500 && yesterday < GOAL
  const color    = yesterday === null ? C.ink40 : onTrack ? C.teal : close ? C.sand : C.rust

  const avg = hasData
    ? Math.round(days.filter(d => d.count !== null).reduce((s, d) => s + d.count!, 0) / days.filter(d => d.count !== null).length)
    : null

  return (
    <Glass dark={dark} span={4} pad={14}>
      <CardLabel dark={dark}>Steps · yday</CardLabel>
      <div className="mono" style={{ fontSize: 'var(--fs-26)', fontWeight: 700, lineHeight: 1, color }}>
        {yesterday !== null ? formatSteps(yesterday) : '—'}
      </div>
      <div className="mono" style={{ fontSize: 'var(--fs-12)', marginTop: 2, opacity: 0.7, color }}>
        {yesterday === null ? 'no data'
          : onTrack ? `goal ✓`
          : `${formatSteps(GOAL - yesterday)} to go`}
      </div>
      {hasData && (
        <div style={{ marginTop: 8 }}>
          <Spark data={sparkData} color={color} w={80} h={20} fill />
          {avg !== null && (
            <div className="mono" style={{ fontSize: 9, opacity: 0.45, marginTop: 3, letterSpacing: '0.06em' }}>
              7d avg {formatSteps(avg)}
            </div>
          )}
        </div>
      )}
    </Glass>
  )
}
