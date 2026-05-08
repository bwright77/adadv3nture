import { useState, useEffect } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { markProcessed, type InboxItem } from '../../lib/inbox'
import { addTodo, type TodoCategory, type TodoUrgency } from '../../lib/todos'
import { addReminder } from '../../lib/reminders'
import { getProjects, addMilestone, type Project } from '../../lib/projects'

type DestType = 'career' | 'family' | 'home' | 'milestone' | 'reminder'

function detectDest(content: string): DestType {
  const lower = content.toLowerCase()
  if (/truck|fj62|rig|engine|oil|coolant|fan|belt|house|gate|fence|yard|roof|plumb/.test(lower)) return 'home'
  if (/sylvia|chase|ada|kids?|school|pickup/.test(lower)) return 'family'
  if (/wa|wright adventures?|jenn|pfb|proposal|invoice|client|contract/.test(lower)) return 'career'
  if (/milestone|feature|ship|deploy|build|implement|design/.test(lower)) return 'milestone'
  return 'career'
}

const TODO_DESTS: { id: DestType; label: string; color: string }[] = [
  { id: 'career', label: 'Career',  color: C.rust },
  { id: 'family', label: 'Family',  color: C.sand },
  { id: 'home',   label: 'Home',    color: '#8B7355' },
]

interface RouteSheetProps {
  item: InboxItem
  onDone: (id: string) => void
  onClose: () => void
}

export function RouteSheet({ item, onDone, onClose }: RouteSheetProps) {
  const { user } = useAuth()
  const [dest, setDest] = useState<DestType>(() => detectDest(item.content))
  const [urgency, setUrgency] = useState<TodoUrgency>('deck')
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (dest === 'milestone' && user && projects.length === 0) {
      getProjects(user.id).then(setProjects).catch(() => null)
    }
  }, [dest, user])

  const canRoute =
    (dest === 'milestone' && projectId !== null) ||
    (dest !== 'milestone')

  async function handleRoute() {
    if (!user || !canRoute || saving) return
    setSaving(true)
    try {
      if (dest === 'milestone') {
        const proj = projects.find(p => p.id === projectId)!
        const sortOrder = 9999
        await addMilestone(proj.id, item.content.trim(), sortOrder)
      } else if (dest === 'reminder') {
        await addReminder(user.id, item.content.trim(), 'personal', 'medium')
      } else {
        await addTodo(user.id, dest as TodoCategory, item.content.trim(), urgency)
      }
      await markProcessed(item.id)
      onDone(item.id)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(26,18,8,0.55)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: C.paper, borderRadius: '20px 20px 0 0',
          padding: '20px 18px 40px', boxShadow: '0 -8px 32px rgba(26,18,8,0.18)',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: C.ink20, borderRadius: 2, margin: '0 auto 18px' }} />

        {/* Item content */}
        <div style={{
          background: '#fff', border: `0.5px solid ${C.ink20}`, borderRadius: 12,
          padding: '11px 14px', marginBottom: 20,
        }}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.14em', marginBottom: 5 }}>ROUTING</div>
          <div style={{ fontSize: 'var(--fs-15)', color: C.dark, lineHeight: 1.4 }}>{item.content}</div>
        </div>

        {/* Todo destinations */}
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.14em', marginBottom: 8 }}>
          ADD TO LIST
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {TODO_DESTS.map(d => {
            const active = dest === d.id
            return (
              <button
                key={d.id}
                onClick={() => setDest(d.id)}
                style={{
                  flex: 1, padding: '10px 4px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: active ? d.color : C.ink20,
                  color: active ? '#fff' : C.ink60,
                  fontSize: 'var(--fs-13)', fontWeight: 700,
                  fontFamily: 'Sora, system-ui, sans-serif',
                  transition: 'background 0.15s',
                  position: 'relative',
                }}
              >
                {d.label}
                {active && (
                  <div style={{
                    position: 'absolute', bottom: 4, left: '30%', right: '30%',
                    height: 2, background: 'rgba(255,255,255,0.5)', borderRadius: 1,
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Urgency — only for todo destinations */}
        {(dest === 'career' || dest === 'family' || dest === 'home') && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {(['fire', 'deck'] as TodoUrgency[]).map(u => {
              const active = urgency === u
              const color = u === 'fire' ? C.rust : C.ink40
              return (
                <button
                  key={u}
                  onClick={() => setUrgency(u)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                    border: active ? `1.5px solid ${color}` : `1px solid ${C.ink20}`,
                    background: active ? (u === 'fire' ? 'rgba(196,82,42,0.1)' : 'rgba(26,18,8,0.06)') : 'transparent',
                    color: active ? color : C.ink40,
                    fontSize: 'var(--fs-12)', fontWeight: 700,
                    fontFamily: 'Sora, system-ui, sans-serif',
                    letterSpacing: '0.06em',
                    transition: 'all 0.15s',
                  }}
                >
                  {u === 'fire' ? '◆ FIRE' : '● ON DECK'}
                </button>
              )
            })}
          </div>
        )}

        {/* Other destinations */}
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.14em', marginBottom: 8 }}>
          OR
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => setDest('milestone')}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
              border: 'none',
              background: dest === 'milestone' ? C.teal : C.ink20,
              color: dest === 'milestone' ? '#fff' : C.ink60,
              fontSize: 'var(--fs-13)', fontWeight: 700,
              fontFamily: 'Sora, system-ui, sans-serif',
              transition: 'background 0.15s',
            }}
          >
            ✦ Milestone
          </button>
          <button
            onClick={() => setDest('reminder')}
            style={{
              flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
              border: 'none',
              background: dest === 'reminder' ? C.rustDk : C.ink20,
              color: dest === 'reminder' ? '#fff' : C.ink60,
              fontSize: 'var(--fs-13)', fontWeight: 700,
              fontFamily: 'Sora, system-ui, sans-serif',
              transition: 'background 0.15s',
            }}
          >
            ● Reminder
          </button>
        </div>

        {/* Project picker — shown when milestone is selected */}
        {dest === 'milestone' && (
          <div style={{ marginBottom: 20 }}>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.teal, letterSpacing: '0.14em', marginBottom: 8 }}>
              PICK PROJECT
            </div>
            {projects.length === 0 ? (
              <div style={{ color: C.ink40, fontSize: 'var(--fs-14)', padding: '8px 0' }}>Loading…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {projects.map(p => {
                  const active = projectId === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => setProjectId(p.id)}
                      style={{
                        textAlign: 'left', padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                        border: active ? `1.5px solid ${C.teal}` : `1px solid ${C.ink20}`,
                        background: active ? 'rgba(91,188,184,0.08)' : '#fff',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 'var(--fs-15)', fontWeight: active ? 600 : 400, color: active ? C.teal : C.dark }}>
                        {p.title}
                      </div>
                      {p.next_action && (
                        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, marginTop: 2 }}>
                          → {p.next_action}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Route button */}
        <button
          onClick={handleRoute}
          disabled={!canRoute || saving}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: canRoute ? C.rust : C.ink20,
            color: canRoute ? C.cream : C.ink40,
            fontSize: 'var(--fs-16)', fontWeight: 700,
            fontFamily: 'Sora, system-ui, sans-serif',
            letterSpacing: '0.04em',
            transition: 'background 0.15s',
          }}
        >
          {saving ? 'Routing…' : dest === 'milestone' && !projectId ? 'Pick a project first' : `Route → ${
            dest === 'milestone' ? projects.find(p => p.id === projectId)?.title ?? 'Project'
            : dest === 'reminder' ? 'Reminders'
            : `${dest.charAt(0).toUpperCase() + dest.slice(1)} ${urgency === 'fire' ? '(FIRE)' : ''}`
          }`}
        </button>
      </div>
    </div>
  )
}
