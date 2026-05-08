import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { setDrinksForDate, getLast7Days } from '../../../lib/drinks'

interface WDrinkEntryProps { dark?: boolean }

function toDateStr(d: Date): string {
  return d.toISOString().substring(0, 10)
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 2)
}

function avg(counts: number[]): string {
  if (!counts.length) return '0.0'
  return (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1)
}

export function WDrinkEntry({ dark }: WDrinkEntryProps) {
  const { user } = useAuth()
  const today = toDateStr(new Date())
  const [count, setCount] = useState(0)
  const [history, setHistory] = useState<{ date: string; count: number }[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    getLast7Days(user.id).then(days => {
      setHistory(days)
      const todayRow = days.find(d => d.date === today)
      setCount(todayRow?.count ?? 0)
    }).catch(() => null)
  }, [user])

  async function updateCount(date: string, next: number) {
    if (!user || next < 0) return
    if (date === today) setCount(next)
    setHistory(prev => prev.map(d => d.date === date ? { ...d, count: next } : d))
    setSaving(true)
    await setDrinksForDate(user.id, date, next)
    setSaving(false)
  }

  const past = history.filter(d => d.date !== today)
  const sevenDayAvg = avg(history.map(d => d.count))
  const onTrack = parseFloat(sevenDayAvg) <= 2.0

  return (
    <Glass dark={dark} span={12} pad={16}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <CardLabel dark={dark}>Drinks today{saving ? ' …' : ''}</CardLabel>
        <span className="mono" style={{ fontSize: 11, opacity: 0.55 }}>ratio · not streak</span>
      </div>

      {/* Today counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <button
          onClick={() => updateCount(today, count - 1)}
          style={{
            width: 44, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
            background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,18,8,0.08)',
            color: dark ? C.cream : C.dark,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 300,
          }}
        >−</button>
        <div className="mono" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, fontFeatureSettings: '"zero" 0' }}>{count}</div>
        <button
          onClick={() => updateCount(today, count + 1)}
          style={{
            width: 44, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer',
            background: C.rust, color: C.cream,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 300,
          }}
        >+</button>
      </div>

      {/* 7-day average */}
      <div className="mono" style={{ fontSize: 12, textAlign: 'center', marginTop: 6, opacity: 0.6 }}>
        7d avg {sevenDayAvg}/d · goal ≤ 2.0 · {onTrack ? '✓ on track' : '↑ over goal'}
      </div>

      {/* Past 6 days */}
      {past.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `0.5px dashed ${dark ? 'rgba(255,255,255,0.1)' : C.ink20}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {past.map(d => (
              <div key={d.date} style={{ textAlign: 'center', flex: 1 }}>
                <div className="mono" style={{ fontSize: 10.5, opacity: 0.5, marginBottom: 4 }}>{dayLabel(d.date)}</div>
                {editing === d.date ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <button
                      onClick={() => updateCount(d.date, d.count + 1)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.6, padding: '0 4px' }}
                    >▲</button>
                    <div className="mono" style={{
                      fontSize: 16, fontWeight: 700,
                      color: d.count > 2 ? C.rust : d.count > 0 ? C.sand : C.ink40,
                    }}>{d.count}</div>
                    <button
                      onClick={() => updateCount(d.date, d.count - 1)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.6, padding: '0 4px' }}
                    >▼</button>
                    <button
                      onClick={() => setEditing(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, opacity: 0.4, marginTop: 2 }}
                    >done</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditing(d.date)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      borderRadius: 6,
                    }}
                  >
                    <div className="mono" style={{
                      fontSize: 16, fontWeight: 700,
                      color: d.count > 2 ? C.rust : d.count > 0 ? C.sand : C.ink40,
                    }}>{d.count}</div>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Glass>
  )
}
