import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getRecentActivities } from '../../../lib/strava'
import { getCurrentTrainingWeek } from '../../../lib/training'
import { logicalToday } from '../../../lib/utils'
import type { Database } from '../../../types/database'

type Activity = Database['public']['Tables']['activities']['Row']

interface WWorkoutProps { dark?: boolean; span?: number }

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

export function WWorkout({ dark, span = 7 }: WWorkoutProps) {
  const { user } = useAuth()
  const today = logicalToday()
  const [todayAct, setTodayAct] = useState<Activity | null | undefined>(undefined)
  const [strength, setStrength] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const [acts, week] = await Promise.all([
        getRecentActivities(user.id, 5).catch(() => [] as Activity[]),
        getCurrentTrainingWeek(user.id).catch(() => null),
      ])
      if (cancelled) return
      setTodayAct(acts.find(a => a.activity_date === today) ?? null)
      setStrength(week?.strength_prescription ?? null)
    })()
    return () => { cancelled = true }
  }, [user, today])

  if (todayAct === undefined) {
    return (
      <Glass dark={dark} span={span} pad={14} flat style={{ background: C.tealDk, border: 'none' }}>
        <CardLabel dark={dark}>Workout</CardLabel>
        <div style={{ opacity: 0.4, fontSize: 'var(--fs-14)', marginTop: 8 }}>Loading…</div>
      </Glass>
    )
  }

  // Today's workout already logged via Strava — reflect it.
  if (todayAct) {
    return (
      <Glass dark={dark} span={span} pad={14} flat style={{ background: C.tealDk, border: 'none' }}>
        <CardLabel dark={dark}>Today · done ✓</CardLabel>
        <div className="badge" style={{ fontSize: 'var(--fs-17)', lineHeight: 1.1, marginTop: 2 }}>
          {todayAct.title?.toUpperCase() ?? todayAct.activity_type.toUpperCase()}
        </div>
        <div className="mono" style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 'var(--fs-13)', flexWrap: 'wrap' }}>
          {todayAct.duration_seconds && <span>{formatDuration(todayAct.duration_seconds)}</span>}
          {todayAct.distance_miles && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{todayAct.distance_miles.toFixed(1)} mi</span>
            </>
          )}
          {todayAct.avg_pace_seconds_per_mile && todayAct.activity_type === 'run' && (
            <span>{formatPace(todayAct.avg_pace_seconds_per_mile)}</span>
          )}
          {todayAct.avg_hr && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{todayAct.avg_hr} bpm</span>
            </>
          )}
        </div>
      </Glass>
    )
  }

  // Nothing logged yet — show what's on the menu this week (prospective, not a
  // day prescription). Strength is part of the weekly schedule, not a program.
  return (
    <Glass dark={dark} span={span} pad={14} flat style={{ background: C.tealDk, border: 'none' }}>
      <CardLabel dark={dark}>This week's strength</CardLabel>
      <div className="badge" style={{ fontSize: 'var(--fs-17)', lineHeight: 1.1, marginTop: 2 }}>
        {(strength ?? 'Row Bootcamp').toUpperCase()}
      </div>
      <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.8, marginTop: 8, lineHeight: 1.4 }}>
        Fit it in when the day allows — Strava logs it. Nothing logged yet today.
      </div>
    </Glass>
  )
}
