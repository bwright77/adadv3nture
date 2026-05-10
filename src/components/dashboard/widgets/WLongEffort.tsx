import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { loadRecovery } from '../../../lib/recovery'
import { getTrainingGoals } from '../../../lib/training'
import { supabase } from '../../../lib/supabase'

interface Props { dark?: boolean }

interface WeekActivity {
  activity_type: string
  title: string | null
  distance_miles: number | null
  elevation_feet: number | null
  duration_seconds: number | null
  activity_date: string
}

interface AnchorGoal {
  event_name: string
  event_date: string
  event_type: string
  distance_label: string | null
}

const BIG_EFFORT_THRESHOLDS = { run: 5.5, ride: 20, hike: 4, ski: 0 }

function isBigEffort(a: WeekActivity): boolean {
  const threshold = BIG_EFFORT_THRESHOLDS[a.activity_type as keyof typeof BIG_EFFORT_THRESHOLDS] ?? 5
  return (a.distance_miles ?? 0) >= threshold
}

function formatDist(mi: number | null): string {
  if (!mi) return ''
  return `${mi.toFixed(1)}mi`
}

function formatElev(ft: number | null): string {
  if (!ft || ft < 100) return ''
  return `+${ft.toLocaleString()}ft`
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

function thisWeekMonday(): string {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString().substring(0, 10)
}

const RECOMMEND: Record<string, { label: string; detail: string }> = {
  go_hard:  { label: 'Long trail run · 6+ miles', detail: 'Howard or Mount Falcon · peak training load' },
  moderate: { label: 'Steady run · 4–5 miles',   detail: 'Keep it comfortable, good form' },
  recovery: { label: 'Easy hike or walk',          detail: 'Skip the big effort today — let it absorb' },
  unknown:  { label: 'Long run or ride',            detail: 'Check recovery data, aim for 5+ miles' },
}

export function WLongEffort({ dark }: Props) {
  const { user } = useAuth()
  const [bigEfforts, setBigEfforts] = useState<WeekActivity[]>([])
  const [allEfforts, setAllEfforts] = useState<WeekActivity[]>([])
  const [anchor, setAnchor] = useState<AnchorGoal | null>(null)
  const [tier, setTier] = useState<string>('unknown')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const monday = thisWeekMonday()
    const today = new Date().toISOString().substring(0, 10)

    Promise.all([
      (supabase as any)
        .from('activities')
        .select('activity_type, title, distance_miles, elevation_feet, duration_seconds, activity_date')
        .eq('user_id', user.id)
        .in('activity_type', ['run', 'ride', 'hike', 'ski', 'walk'])
        .gte('activity_date', monday)
        .lte('activity_date', today)
        .order('activity_date', { ascending: false }),
      getTrainingGoals(user.id),
      loadRecovery(user.id),
    ]).then(([activitiesRes, goals, recovery]) => {
      const acts = (activitiesRes.data ?? []) as WeekActivity[]
      setAllEfforts(acts)
      setBigEfforts(acts.filter(isBigEffort))
      setAnchor(goals.find(g => g.is_anchor) ?? goals[0] ?? null)
      setTier(recovery.tier)
    }).catch(() => null).finally(() => setLoading(false))
  }, [user])

  const subColor = dark ? 'rgba(245,237,214,0.55)' : C.ink60
  const rec = RECOMMEND[tier] ?? RECOMMEND.unknown
  const anchorDays = anchor ? daysUntil(anchor.event_date) : null
  const weekMiles = allEfforts.reduce((s, a) => s + (a.distance_miles ?? 0), 0)

  return (
    <Glass dark={dark} span={12} pad={16}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, background: C.rust, borderRadius: 1 }} />
          <span className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.14em', color: subColor }}>
            LONG EFFORT
          </span>
        </div>
        {anchor && anchorDays !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.rust }}>{anchorDays}d</span>
            <span className="mono" style={{ fontSize: 'var(--fs-10)', color: subColor, opacity: 0.7 }}>
              {anchor.event_name.split(' ').slice(0, 3).join(' ')}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.4 }}>Loading…</div>
      ) : bigEfforts.length > 0 ? (
        /* Done this week */
        <div>
          <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.teal, letterSpacing: '0.08em', marginBottom: 8 }}>
            ✓ DONE THIS WEEK
          </div>
          {bigEfforts.slice(0, 2).map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4,
              paddingBottom: 4,
              borderBottom: i < bigEfforts.length - 1 && i < 1
                ? `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(26,18,8,0.07)'}` : 'none',
            }}>
              <span className="badge" style={{ fontSize: 'var(--fs-14)', color: dark ? C.cream : C.dark }}>
                {a.title ?? a.activity_type}
              </span>
              <span className="mono" style={{ fontSize: 'var(--fs-11)', color: subColor }}>
                {[formatDist(a.distance_miles), formatElev(a.elevation_feet)].filter(Boolean).join(' · ')}
              </span>
            </div>
          ))}
          {weekMiles > 0 && (
            <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.45, marginTop: 6 }}>
              {weekMiles.toFixed(1)} miles this week total
            </div>
          )}
        </div>
      ) : (
        /* Not done yet */
        <div>
          <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.4, letterSpacing: '0.08em', marginBottom: 10 }}>
            NO BIG EFFORT YET THIS WEEK
          </div>
          <div style={{
            borderLeft: `2px solid ${C.rust}`, paddingLeft: 12,
          }}>
            <div className="badge" style={{ fontSize: 'var(--fs-15)', color: dark ? C.cream : C.dark, marginBottom: 3 }}>
              {rec.label}
            </div>
            <div className="mono" style={{ fontSize: 'var(--fs-11)', color: subColor }}>
              {rec.detail}
            </div>
          </div>
          {weekMiles > 0 && (
            <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.4, marginTop: 10 }}>
              {weekMiles.toFixed(1)} mi logged so far this week
            </div>
          )}
        </div>
      )}
    </Glass>
  )
}
