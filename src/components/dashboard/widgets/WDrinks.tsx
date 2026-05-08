import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { Spark } from '../../ui/Spark'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getLast7Days } from '../../../lib/drinks'

interface WDrinksProps { dark?: boolean }

export function WDrinks({ dark }: WDrinksProps) {
  const { user } = useAuth()
  const [data, setData] = useState<number[]>([])

  useEffect(() => {
    if (!user) return
    getLast7Days(user.id)
      .then(days => setData(days.map(d => d.count)))
      .catch(() => null)
  }, [user])

  const avg = data.length ? (data.reduce((a, b) => a + b, 0) / data.length).toFixed(1) : '—'
  const onTrack = data.length ? parseFloat(avg) <= 2.0 : true

  return (
    <Glass dark={dark} span={4} pad={14}>
      <CardLabel dark={dark}>Drinks · 7d</CardLabel>
      <div className="mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, fontFeatureSettings: '"zero" 0' }}>
        {avg}<span style={{ fontSize: 11, opacity: 0.5 }}>/d</span>
      </div>
      <div className="mono" style={{
        fontSize: 9.5, marginTop: 2,
        color: onTrack ? C.teal : C.rust,
        opacity: 0.85,
      }}>
        goal ≤ 2.0 {onTrack ? '✓' : '↑'}
      </div>
      {data.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Spark data={data} color={onTrack ? C.teal : C.rust} w={80} h={20} fill />
        </div>
      )}
    </Glass>
  )
}
