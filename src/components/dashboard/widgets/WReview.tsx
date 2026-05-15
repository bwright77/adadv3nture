import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getPlanForDate, updateReviewRow, getReviewHistory, type DailyPlan, type ReviewCategory, type PilotLights } from '../../../lib/daily-plan'
import { getTodayMood, setTodayMood } from '../../../lib/mood'
import { logicalToday, isInLogicalToday } from '../../../lib/utils'
import { getRecentActivities } from '../../../lib/strava'
import type { Database } from '../../../types/database'

type Activity = Database['public']['Tables']['activities']['Row']

interface WReviewProps {
  dark?: boolean
  hideCareer?: boolean
  forDate?: string
  labelOverride?: string
  onSaved?: () => void
}

interface RowConfig {
  label: string
  category: ReviewCategory | null  // null = BODY (Strava)
  doneKey: keyof DailyPlan | null
  noteKey: keyof DailyPlan | null
}

const ROWS: RowConfig[] = [
  { label: 'BODY',     category: null,               doneKey: null,                     noteKey: null },
  { label: 'CAREER',   category: 'career',            doneKey: 'career_done',            noteKey: 'career_note' },
  { label: 'FAMILY',   category: 'family_creative',   doneKey: 'family_creative_done',   noteKey: 'family_creative_note' },
  { label: 'HOME',     category: 'home',              doneKey: 'home_done',              noteKey: 'home_note' },
  { label: 'PROJECTS', category: 'projects',          doneKey: 'projects_done',          noteKey: 'projects_note' },
]

const CAT_TO_PILOT: Record<string, keyof PilotLights> = {
  career: 'career',
  family_creative: 'family_creative',
  home: 'home',
  projects: 'projects',
}

export function WReview({ dark, hideCareer, forDate, labelOverride, onSaved }: WReviewProps) {
  const { user } = useAuth()
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [todayAct, setTodayAct] = useState<Activity | null>(null)
  const [editing, setEditing] = useState<ReviewCategory | null>(null)
  const [draftNote, setDraftNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [pilotLights, setPilotLights] = useState<PilotLights | null>(null)
  const [mood, setMood] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)

  const today = logicalToday()
  const targetDate = forDate ?? today
  const isToday = targetDate === today

  useEffect(() => {
    if (!user) return
    Promise.all([
      getPlanForDate(user.id, targetDate),
      getRecentActivities(user.id, 7),
      getReviewHistory(user.id),
      getTodayMood(user.id, targetDate),
    ]).then(([p, acts, history, m]) => {
      setPlan(p as DailyPlan | null)
      // BODY MIT: when reviewing today, catch workouts in the logical-today
      // window (6am today through 6am tomorrow) so late-night activities
      // pick up. For prior days just match activity_date.
      // Skip sub-10-minute activities (warm-ups, stretches) — same floor
      // program-tracker uses when counting strength sessions.
      setTodayAct(
        (acts as Activity[]).find(a => {
          if ((a.duration_seconds ?? 0) <= 600) return false
          if (isToday) {
            if (a.start_time) return isInLogicalToday(a.start_time)
            return a.activity_date === targetDate
          }
          return a.activity_date === targetDate
        }) ?? null,
      )
      setPilotLights(history.pilotLights)
      setMood(m as number | null)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [user, targetDate, isToday])

  async function handleMood(score: number) {
    if (!user) return
    // Tap the same value to clear.
    const next = mood === score ? null : score
    setMood(next)
    try { await setTodayMood(user.id, next, targetDate) } catch { /* ignore */ }
  }

  async function handleSave(category: ReviewCategory, done: boolean) {
    if (!user) return
    setSaving(true)
    await updateReviewRow(user.id, category, done, draftNote, targetDate)
    const updated = await getPlanForDate(user.id, targetDate)
    setPlan(updated)
    setEditing(null)
    setSaving(false)
    onSaved?.()
  }

  function openEdit(category: ReviewCategory) {
    const noteKey = ROWS.find(r => r.category === category)?.noteKey
    const current = noteKey && plan ? (plan[noteKey] as string | null) ?? '' : ''
    setDraftNote(current)
    setEditing(category)
  }

  return (
    <Glass dark={dark} span={12} pad={16}>
      <CardLabel dark={dark}>{labelOverride ?? 'Day review'}</CardLabel>

      {/* MOOD — weep → big smile (1-5). Tap the selected face to clear. */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: `0.5px dashed ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(26,18,8,0.12)'}`,
      }}>
        <span className="badge" style={{
          fontSize: 'var(--fs-13)',
          color: mood == null
            ? (dark ? 'rgba(245,237,214,0.4)' : C.ink40)
            : (dark ? C.cream : C.dark),
        }}>
          MOOD
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { n: 1, emoji: '😭', label: 'Weeping' },
            { n: 2, emoji: '😢', label: 'Sad' },
            { n: 3, emoji: '😐', label: 'Neutral' },
            { n: 4, emoji: '🙂', label: 'Good' },
            { n: 5, emoji: '😄', label: 'Great' },
          ].map(({ n, emoji, label }) => {
            const selected = mood === n
            return (
              <button
                key={n}
                onClick={() => handleMood(n)}
                aria-label={label}
                title={label}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: selected
                    ? (dark ? 'rgba(196,82,42,0.25)' : 'rgba(196,82,42,0.15)')
                    : 'transparent',
                  border: `1px solid ${selected
                    ? C.rust
                    : (dark ? 'rgba(255,255,255,0.10)' : 'rgba(26,18,8,0.10)')}`,
                  cursor: 'pointer', padding: 0, lineHeight: 1,
                  fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: mood == null || selected ? 1 : 0.55,
                  transition: 'opacity 0.15s, background 0.15s',
                }}
              >
                {emoji}
              </button>
            )
          })}
        </div>
      </div>

      {ROWS.filter(r => !(hideCareer && r.label === 'CAREER')).map((row, i) => {
        const done = row.doneKey && plan ? Boolean(plan[row.doneKey]) : false
        const note = row.noteKey && plan ? (plan[row.noteKey] as string | null) : null

        // BODY row — show Strava activity
        if (row.category === null) {
          const bodyText = todayAct
            ? `${todayAct.title ?? todayAct.activity_type}${todayAct.duration_seconds ? ` · ${Math.round(todayAct.duration_seconds / 60)}m` : ''} ✓`
            : !loaded ? '…' : '—'
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', padding: '8px 0',
              borderBottom: `0.5px dashed ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(26,18,8,0.12)'}`,
            }}>
              <span className="badge" style={{ fontSize: 'var(--fs-13)', color: dark ? C.cream : C.dark }}>
                {row.label}
              </span>
              <span className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.7 }}>{bodyText}</span>
            </div>
          )
        }

        const isEditing = editing === row.category
        const isEmpty = !note && !done
        const pilotKey = row.category ? CAT_TO_PILOT[row.category] : null
        const staleDays = pilotKey && pilotLights ? pilotLights[pilotKey] : 0
        const isDark3 = staleDays >= 3

        return (
          <div key={i} style={{
            borderBottom: i < ROWS.length - 1
              ? `0.5px dashed ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(26,18,8,0.12)'}`
              : 'none',
          }}>
            {/* Row header */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', cursor: 'pointer' }}
              onClick={() => isEditing ? setEditing(null) : openEdit(row.category!)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span className="badge" style={{
                  fontSize: 'var(--fs-13)',
                  color: isEmpty
                    ? (dark ? 'rgba(245,237,214,0.4)' : C.ink40)
                    : (dark ? C.cream : C.dark),
                }}>
                  {row.label}
                </span>
                {staleDays >= 2 && !done && (
                  <span className="mono" style={{
                    fontSize: 'var(--fs-10)', letterSpacing: '0.08em',
                    color: isDark3 ? C.rust : (dark ? 'rgba(245,237,214,0.45)' : C.ink40),
                  }}>
                    {staleDays}d
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden', justifyContent: 'flex-end', marginLeft: 12 }}>
                <span className="mono" style={{
                  fontSize: 'var(--fs-12)', opacity: 0.7,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {note ? note : done ? '✓' : '—'}
                </span>
                {done && (
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'var(--color-teal-20)', color: C.teal,
                    fontSize: 'var(--fs-10)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>✓</span>
                )}
              </div>
            </div>

            {/* Inline edit */}
            {isEditing && (
              <div style={{ paddingBottom: 10 }}>
                <textarea
                  autoFocus
                  value={draftNote}
                  onChange={e => setDraftNote(e.target.value)}
                  placeholder="What did you do? (optional note)"
                  rows={2}
                  style={{
                    width: '100%', fontSize: 'var(--fs-13)', lineHeight: 1.4, padding: '6px 8px',
                    borderRadius: 8,
                    border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : C.ink20}`,
                    background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(26,18,8,0.04)',
                    color: dark ? C.cream : C.dark,
                    resize: 'none', boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button
                    onClick={() => handleSave(row.category!, true)}
                    disabled={saving}
                    style={{
                      flex: 1, padding: '5px 0', borderRadius: 8,
                      background: C.teal, color: C.dark,
                      border: 'none', cursor: 'pointer', fontSize: 'var(--fs-12)', fontWeight: 700,
                    }}
                  >
                    {saving ? '…' : '✓ Done'}
                  </button>
                  <button
                    onClick={() => handleSave(row.category!, false)}
                    disabled={saving}
                    style={{
                      flex: 1, padding: '5px 0', borderRadius: 8,
                      background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,18,8,0.08)',
                      color: dark ? C.cream : C.dark,
                      border: 'none', cursor: 'pointer', fontSize: 'var(--fs-12)',
                    }}
                  >
                    Log note only
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    style={{
                      padding: '5px 10px', borderRadius: 8,
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 'var(--fs-12)', opacity: 0.4, color: dark ? C.cream : C.dark,
                    }}
                  >
                    cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </Glass>
  )
}
