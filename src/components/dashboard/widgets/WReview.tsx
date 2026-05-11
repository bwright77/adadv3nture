import { useEffect, useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getTodayPlan, updateReviewRow, getReviewHistory, type DailyPlan, type ReviewCategory, type PilotLights } from '../../../lib/daily-plan'
import { logicalToday } from '../../../lib/utils'
import { getRecentActivities } from '../../../lib/strava'
import type { Database } from '../../../types/database'

type Activity = Database['public']['Tables']['activities']['Row']

interface WReviewProps { dark?: boolean; hideCareer?: boolean }

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

export function WReview({ dark, hideCareer }: WReviewProps) {
  const { user } = useAuth()
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [todayAct, setTodayAct] = useState<Activity | null>(null)
  const [editing, setEditing] = useState<ReviewCategory | null>(null)
  const [draftNote, setDraftNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [pilotLights, setPilotLights] = useState<PilotLights | null>(null)

  const today = logicalToday()

  useEffect(() => {
    if (!user) return
    Promise.all([
      getTodayPlan(user.id),
      getRecentActivities(user.id, 3),
      getReviewHistory(user.id),
    ]).then(([p, acts, history]) => {
      setPlan(p as DailyPlan | null)
      setTodayAct((acts as Activity[]).find(a => a.activity_date === today) ?? null)
      setPilotLights(history.pilotLights)
    }).catch(() => null)
  }, [user])

  async function handleSave(category: ReviewCategory, done: boolean) {
    if (!user) return
    setSaving(true)
    await updateReviewRow(user.id, category, done, draftNote)
    const updated = await getTodayPlan(user.id)
    setPlan(updated)
    setEditing(null)
    setSaving(false)
  }

  function openEdit(category: ReviewCategory) {
    const noteKey = ROWS.find(r => r.category === category)?.noteKey
    const current = noteKey && plan ? (plan[noteKey] as string | null) ?? '' : ''
    setDraftNote(current)
    setEditing(category)
  }

  return (
    <Glass dark={dark} span={12} pad={16}>
      <CardLabel dark={dark}>Day review</CardLabel>

      {ROWS.filter(r => !(hideCareer && r.label === 'CAREER')).map((row, i) => {
        const done = row.doneKey && plan ? Boolean(plan[row.doneKey]) : false
        const note = row.noteKey && plan ? (plan[row.noteKey] as string | null) : null

        // BODY row — show Strava activity
        if (row.category === null) {
          const bodyText = todayAct
            ? `${todayAct.title ?? todayAct.activity_type}${todayAct.duration_seconds ? ` · ${Math.round(todayAct.duration_seconds / 60)}m` : ''} ✓`
            : plan === undefined ? '…' : '—'
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
