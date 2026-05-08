import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getTodos, type Todo } from '../../../lib/todos'
import { useWeather } from '../../../hooks/useWeather'

interface W4PMProps { dark?: boolean }

const EFFORT_LABEL: Record<string, string> = {
  quick: 'quick · ~30m',
  half_day: 'half day',
  full_day: 'full day',
  multi_day: 'multi-day',
}

export function W4PM({ dark }: W4PMProps) {
  const { user } = useAuth()
  const { weather, loading: weatherLoading } = useWeather()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    // Load home category todos (covers house + truck)
    Promise.all([
      getTodos(user.id, 'home'),
      getTodos(user.id, 'personal'),
    ]).then(([home, personal]) => {
      setTodos([...home, ...personal])
    }).catch(() => null).finally(() => setLoading(false))
  }, [user])

  const isLoading = loading || weatherLoading

  if (isLoading) {
    return (
      <Glass dark={dark} span={12} pad={16}>
        <CardLabel dark={dark}>4pm project</CardLabel>
        <div style={{ opacity: 0.4, fontSize: 11, marginTop: 8 }}>Loading…</div>
      </Glass>
    )
  }

  // Pick the best todo for this afternoon's conditions
  const isAfternoonWet = weather?.afternoonWet ?? false
  const afPmTemp = weather?.afternoonTempF ?? 70

  // Filter by weather_required — skip 'sunny' or 'dry' tasks if it's wet
  const eligible = todos.filter(t => {
    if (isAfternoonWet && t.weather_required === 'sunny') return false
    if (isAfternoonWet && t.weather_required === 'dry') return false
    return true
  })

  const pick = eligible[0] ?? todos[0] ?? null

  const weatherTag = isAfternoonWet
    ? `WET · ${afPmTemp}°`
    : `DRY · ${afPmTemp}°`
  const weatherColor = isAfternoonWet ? C.sand : C.teal
  const weatherBadge = isAfternoonWet ? 'indoor task' : pick?.weather_required === 'sunny' ? 'sunny needed' : 'outdoor ok'

  if (!pick) {
    return (
      <Glass dark={dark} span={12} pad={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <CardLabel dark={dark}>4pm project · weather routed</CardLabel>
          <span className="mono" style={{ fontSize: 9, color: weatherColor }}>{weatherTag}</span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.45, marginTop: 8 }}>No tasks in queue — add some in Lists.</div>
      </Glass>
    )
  }

  return (
    <Glass dark={dark} span={12} pad={16}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <CardLabel dark={dark}>4pm project · weather routed</CardLabel>
        <span className="mono" style={{ fontSize: 9, color: weatherColor }}>{weatherTag}</span>
      </div>
      <div className="badge" style={{ fontSize: 17, marginTop: 4, lineHeight: 1.15 }}>
        {pick.title.toUpperCase()}
      </div>
      {pick.notes && (
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4, lineHeight: 1.4 }}>{pick.notes}</div>
      )}
      <div className="mono" style={{ display: 'flex', gap: 6, marginTop: 10, fontSize: 10, flexWrap: 'wrap' }}>
        {pick.effort && (
          <span style={{
            background: C.teal + '33', color: dark ? C.teal : C.dark,
            padding: '3px 8px', borderRadius: 4,
          }}>
            {EFFORT_LABEL[pick.effort] ?? pick.effort}
          </span>
        )}
        <span style={{
          background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,18,8,0.07)',
          padding: '3px 8px', borderRadius: 4,
        }}>
          {weatherBadge}
        </span>
        <span style={{
          background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(26,18,8,0.05)',
          padding: '3px 8px', borderRadius: 4, opacity: 0.7,
        }}>
          {pick.category}
        </span>
      </div>
    </Glass>
  )
}
