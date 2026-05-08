import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getRecentActivities } from '../../../lib/strava'
import type { Database } from '../../../types/database'

type Activity = Database['public']['Tables']['activities']['Row']

interface WWorkoutProps { dark?: boolean }

function formatDuration(s: number | null): string {
  if (!s) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatPace(spm: number | null): string {
  if (!spm) return ''
  const m = Math.floor(spm / 60)
  const s = spm % 60
  return `${m}:${String(s).padStart(2, '0')}/mi`
}

const TYPE_LABEL: Record<string, string> = {
  run: 'RUN', ride: 'RIDE', strength: 'STRENGTH',
  workout: 'WORKOUT', hike: 'HIKE', walk: 'WALK',
}

export function WWorkout({ dark }: WWorkoutProps) {
  const { user } = useAuth()
  const [last, setLast] = useState<Activity | null | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    getRecentActivities(user.id, 1).then(rows => setLast(rows[0] ?? null))
  }, [user])

  // Still loading
  if (last === undefined) {
    return (
      <Glass dark={dark} span={7} pad={14}>
        <CardLabel dark={dark}>Last workout</CardLabel>
        <div style={{ opacity: 0.4, fontSize: 12, marginTop: 8 }}>Loading…</div>
      </Glass>
    )
  }

  // No activities yet
  if (last === null) {
    return (
      <Glass dark={dark} span={7} pad={14}>
        <CardLabel dark={dark}>Today · prescribed</CardLabel>
        <div className="badge" style={{ fontSize: 19, lineHeight: 1.05, marginTop: 2 }}>
          TOTAL STRENGTH<br />
          <span style={{ color: C.teal }}>W1 · D2 · CHEST</span>
        </div>
        <div className="mono" style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11 }}>
          <span>45 min</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>indoor</span>
        </div>
        <div style={{ marginTop: 10, height: 3, background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,18,8,0.08)', borderRadius: 2 }}>
          <div style={{ width: '12%', height: '100%', background: C.rust, borderRadius: 2 }} />
        </div>
        <div className="mono" style={{ fontSize: 9, marginTop: 4, opacity: 0.6 }}>
          Connect Strava in Log tab for real data
        </div>
      </Glass>
    )
  }

  const isToday = last.activity_date === new Date().toISOString().substring(0, 10)
  const isYesterday = last.activity_date === new Date(Date.now() - 86400000).toISOString().substring(0, 10)
  const when = isToday ? 'Today' : isYesterday ? 'Yesterday' : new Date(last.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <Glass dark={dark} span={7} pad={14}>
      <CardLabel dark={dark}>{when} · {TYPE_LABEL[last.activity_type] ?? last.activity_type}</CardLabel>
      <div className="badge" style={{ fontSize: 17, lineHeight: 1.1, marginTop: 2 }}>
        {last.title?.toUpperCase() ?? last.activity_type.toUpperCase()}
      </div>
      <div className="mono" style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, flexWrap: 'wrap' }}>
        {last.distance_miles && (
          <span>{last.distance_miles.toFixed(1)} mi</span>
        )}
        {last.duration_seconds && (
          <span>{formatDuration(last.duration_seconds)}</span>
        )}
        {last.avg_pace_seconds_per_mile && last.activity_type === 'run' && (
          <span style={{ opacity: 0.5 }}>·</span>
        )}
        {last.avg_pace_seconds_per_mile && last.activity_type === 'run' && (
          <span>{formatPace(last.avg_pace_seconds_per_mile)}</span>
        )}
        {last.avg_hr && (
          <>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{last.avg_hr} bpm</span>
          </>
        )}
      </div>
      {last.elevation_feet && (
        <div className="mono" style={{ fontSize: 9, marginTop: 6, opacity: 0.6 }}>
          +{last.elevation_feet.toLocaleString()} ft gain
        </div>
      )}
    </Glass>
  )
}
