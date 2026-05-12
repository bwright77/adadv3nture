import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { Spark } from '../../ui/Spark'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getLast7DaysSteps } from '../../../lib/recovery'

const GOAL = 10_000

interface WStepsProps { dark?: boolean; span?: number }

function formatSteps(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export function WSteps({ dark, span = 4 }: WStepsProps) {
  const { user } = useAuth()
  const [days, setDays] = useState<{ date: string; count: number | null }[]>([])

  useEffect(() => {
    if (!user) return
    getLast7DaysSteps(user.id).then(setDays).catch(() => null)
  }, [user])

  // Apple Health steps lag a day — the most recent populated entry is
  // typically yesterday. We render it as a reflection: how did the
  // most recent complete day land vs. the user's own 7-day baseline?
  const latest = [...days].reverse().find((d: { date: string; count: number | null }) => d.count !== null) ?? null
  const yesterday = latest?.count ?? null
  const sparkData = days.map(d => d.count ?? 0)
  const hasData = days.some(d => d.count !== null)

  // Goal coloring still useful as a "was that a strong day?" signal,
  // but we drop the "X to go" copy because yesterday is over.
  const onTrack = yesterday !== null && yesterday >= GOAL
  const close   = yesterday !== null && yesterday >= 7500 && yesterday < GOAL
  const color   = yesterday === null ? C.ink40 : onTrack ? C.teal : close ? C.sand : C.rust

  const populated = days.filter(d => d.count !== null)
  const avg = populated.length > 0
    ? Math.round(populated.reduce((s, d) => s + d.count!, 0) / populated.length)
    : null

  // Reflective subtitle: where did yesterday sit relative to the
  // rolling average? Positive = above baseline, negative = below.
  let subtitle = 'no data'
  let subtitleColor: string | undefined = undefined
  if (yesterday !== null && avg !== null && populated.length >= 2) {
    const delta = yesterday - avg
    if (Math.abs(delta) < 250) {
      subtitle = '= 7d avg'
    } else if (delta > 0) {
      subtitle = `↑ ${formatSteps(delta)} vs 7d avg`
      subtitleColor = C.teal
    } else {
      subtitle = `↓ ${formatSteps(-delta)} vs 7d avg`
      subtitleColor = C.rust
    }
  } else if (yesterday !== null) {
    subtitle = onTrack ? 'hit 10k goal' : `${formatSteps(yesterday)} steps`
  }

  return (
    <Glass dark={dark} span={span} pad={14}>
      <CardLabel dark={dark}>Steps · yday</CardLabel>
      <div className="mono" style={{ fontSize: 'var(--fs-26)', fontWeight: 700, lineHeight: 1, color }}>
        {yesterday !== null ? formatSteps(yesterday) : '—'}
      </div>
      <div className="mono" style={{ fontSize: 'var(--fs-12)', marginTop: 2, opacity: 0.8, color: subtitleColor }}>
        {subtitle}
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
