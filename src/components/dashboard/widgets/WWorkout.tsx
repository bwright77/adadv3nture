import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getRecentActivities } from '../../../lib/strava'
import { getProgram, advanceProgram, type ProgramState } from '../../../lib/program-tracker'
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

function ProgramProgress({ program, dark, onDone, advancing }: {
  program: ProgramState | null
  dark?: boolean
  onDone: () => void
  advancing: boolean
}) {
  const week = program?.current_week ?? 1
  const day = program?.current_day ?? 1
  const totalWeeks = program?.total_weeks ?? 4
  const totalDays = totalWeeks * 4
  const completedDays = (week - 1) * 4 + (day - 1)
  const progress = completedDays / totalDays

  return (
    <>
      <div style={{
        marginTop: 10, height: 3,
        background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,18,8,0.08)',
        borderRadius: 2,
      }}>
        <div style={{
          width: `${Math.max(2, progress * 100)}%`,
          height: '100%', background: C.rust, borderRadius: 2,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
        <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.6 }}>
          W{week} of {totalWeeks} · D{day} of 4 · {Math.round(progress * 100)}% done
        </div>
        <button
          onClick={onDone}
          disabled={advancing}
          style={{
            background: C.teal, color: C.dark, border: 'none', cursor: 'pointer',
            padding: '4px 10px', borderRadius: 8, fontSize: 'var(--fs-12)', fontWeight: 700,
          }}
        >
          {advancing ? '…' : 'Done ✓'}
        </button>
      </div>
    </>
  )
}

export function WWorkout({ dark, span = 7 }: WWorkoutProps) {
  const { user } = useAuth()
  const today = new Date().toISOString().substring(0, 10)
  const [todayAct, setTodayAct] = useState<Activity | null | undefined>(undefined)
  const [program, setProgram] = useState<ProgramState | null>(null)
  const [advancing, setAdvancing] = useState(false)

  async function reload() {
    if (!user) return
    const [acts, prog] = await Promise.all([
      getRecentActivities(user.id, 5),
      getProgram(user.id),
    ]) as [Activity[], ProgramState | null]
    setTodayAct(acts.find(a => a.activity_date === today) ?? null)
    setProgram(prog)
  }

  useEffect(() => {
    reload().catch(() => setTodayAct(null))
  }, [user])

  async function handleDone() {
    if (!user) return
    setAdvancing(true)
    await advanceProgram(user.id)
    setProgram(await getProgram(user.id))
    setAdvancing(false)
  }

  if (todayAct === undefined) {
    return (
      <Glass dark={dark} span={span} pad={14}>
        <CardLabel dark={dark}>Workout</CardLabel>
        <div style={{ opacity: 0.4, fontSize: 'var(--fs-14)', marginTop: 8 }}>Loading…</div>
      </Glass>
    )
  }

  // Today's workout already logged via Strava
  if (todayAct) {
    const isStrength = ['strength', 'workout', 'weight_training'].includes(todayAct.activity_type)
    return (
      <Glass dark={dark} span={span} pad={14}>
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
        {isStrength && (
          <ProgramProgress program={program} dark={dark} onDone={handleDone} advancing={advancing} />
        )}
      </Glass>
    )
  }

  // No activity yet — show prescribed
  const title = program?.next_workout_title ?? 'Total Strength'
  const parts = title.split('·').map((p: string) => p.trim())

  return (
    <Glass dark={dark} span={span} pad={14}>
      <CardLabel dark={dark}>Today · prescribed</CardLabel>
      <div className="badge" style={{ fontSize: 'var(--fs-17)', lineHeight: 1.1, marginTop: 2 }}>
        <span>{parts[0]}</span>
        {parts[1] && <span style={{ color: C.teal }}> · {parts[1]}</span>}
        {parts[2] && <span> · {parts[2]}</span>}
      </div>
      <ProgramProgress program={program} dark={dark} onDone={handleDone} advancing={advancing} />
    </Glass>
  )
}
