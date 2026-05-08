import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { C } from '../tokens'
import {
  getTodos, getCompletedTodos, addTodo, completeTodo, deleteTodo, moveTodo, setTodoUrgency,
  type Todo, type TodoCategory, type TodoUrgency,
} from '../lib/todos'
import {
  getActiveReminders, addReminder, snoozeReminder, completeReminder, deleteReminder,
  type Reminder,
} from '../lib/reminders'
import { TrainingView } from '../components/todos/TrainingView'
import { ProjectsView } from '../components/todos/ProjectsView'
import { CareerView } from '../components/todos/CareerView'

const URGENCY_ORDER: Record<TodoUrgency, number> = { fire: 0, deck: 1, rain: 2 }

const URGENCY: Record<TodoUrgency, { label: string; glyph: string; color: string; bg: string; rowBg: string; dim: boolean }> = {
  fire: { label: 'FIRE',     glyph: '◆', color: '#C4522A', bg: 'rgba(196,82,42,0.14)', rowBg: 'rgba(196,82,42,0.05)', dim: false },
  deck: { label: 'ON DECK',  glyph: '●', color: 'rgba(26,18,8,0.4)', bg: 'transparent', rowBg: '#fff', dim: false },
  rain: { label: 'RAIN DAY', glyph: '○', color: '#2A6F6C', bg: 'rgba(91,188,184,0.12)', rowBg: '#fff', dim: true },
}

function UrgencyChip({ urgency, onChange }: { urgency: TodoUrgency; onChange: (u: TodoUrgency) => void }) {
  const u = URGENCY[urgency]
  const cycle: Record<TodoUrgency, TodoUrgency> = { fire: 'deck', deck: 'rain', rain: 'fire' }
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(cycle[urgency]) }}
      title={`Priority: ${u.label} — tap to change`}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: urgency === 'deck' ? '3px 6px' : '3px 8px',
        borderRadius: 999, border: urgency === 'rain' ? `1px solid ${u.color}` : 'none',
        background: u.bg, cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: 8, color: u.color, lineHeight: 1 }}>{u.glyph}</span>
      {urgency !== 'deck' && (
        <span className="mono" style={{ fontSize: 'var(--fs-10)', color: u.color, fontWeight: 700, letterSpacing: '0.1em', lineHeight: 1 }}>
          {u.label}
        </span>
      )}
    </button>
  )
}

function UrgencySelector({ value, onChange }: { value: TodoUrgency; onChange: (u: TodoUrgency) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {(['fire', 'deck', 'rain'] as TodoUrgency[]).map(u => {
        const tier = URGENCY[u]
        const active = value === u
        return (
          <button
            key={u}
            onClick={() => onChange(u)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
              border: active
                ? `1.5px solid ${tier.color}`
                : `1px solid rgba(26,18,8,0.15)`,
              background: active ? tier.bg : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 8, color: tier.color }}>{tier.glyph}</span>
            <span className="mono" style={{
              fontSize: 'var(--fs-10)', fontWeight: active ? 700 : 500,
              color: active ? tier.color : 'rgba(26,18,8,0.45)',
              letterSpacing: '0.1em',
            }}>{tier.label}</span>
          </button>
        )
      })}
    </div>
  )
}

type TabId = TodoCategory | 'training' | 'projects'

const TABS: { id: TabId; label: string; color: string }[] = [
  { id: 'training',  label: 'Training', color: C.teal },
  { id: 'career',    label: 'Career',   color: C.rust },
  { id: 'family',    label: 'Family',   color: C.sand },
  { id: 'home',      label: 'Home',     color: '#8B7355' },
  { id: 'projects',  label: 'Projects', color: '#7B9E87' },
]


interface TodosPageProps { bgPhoto?: string; initialTab?: TabId }

export function TodosPage({ bgPhoto, initialTab }: TodosPageProps) {
  const { user } = useAuth()
  const [tab, setTab] = useState<TabId>(initialTab ?? 'training')

  useEffect(() => {
    if (initialTab) setTab(initialTab)
  }, [initialTab])
  const [cat, setCat] = useState<TodoCategory>('career')
  const [todos, setTodos] = useState<Todo[]>([])
  const [done, setDone] = useState<Todo[]>([])
  const [showDone, setShowDone] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftUrgency, setDraftUrgency] = useState<TodoUrgency>('deck')
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [addingReminder, setAddingReminder] = useState(false)
  const [reminderDraft, setReminderDraft] = useState('')

  const isTodoTab = tab !== 'training' && tab !== 'projects' && tab !== 'career'
  const current = TABS.find(t => t.id === (isTodoTab ? cat : tab))!

  function sortByUrgency(list: Todo[]): Todo[] {
    return [...list].sort((a, b) => {
      const ud = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
      return ud !== 0 ? ud : a.priority_order - b.priority_order
    })
  }

  async function load() {
    if (!user || !isTodoTab) return
    setLoading(true)
    const [open, closed, active] = await Promise.all([
      getTodos(user.id, cat),
      getCompletedTodos(user.id, cat),
      getActiveReminders(user.id),
    ])
    setTodos(sortByUrgency(open))
    setDone(closed)
    setReminders(active)
    setLoading(false)
  }

  useEffect(() => { load() }, [cat, user, isTodoTab])

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  async function handleAdd() {
    if (!user || !draft.trim()) { setAdding(false); setDraft(''); return }
    const item = await addTodo(user.id, cat, draft.trim(), draftUrgency)
    setTodos(prev => sortByUrgency([...prev, item]))
    setDraft('')
    setDraftUrgency('deck')
    setAdding(false)
  }

  async function handleUrgencyChange(id: string, urgency: TodoUrgency) {
    setTodos(prev => sortByUrgency(prev.map(t => t.id === id ? { ...t, urgency } : t)))
    await setTodoUrgency(id, urgency)
  }

  async function handleComplete(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id))
    await completeTodo(id)
    const closed = await getCompletedTodos(user!.id, cat)
    setDone(closed)
  }

  async function handleDelete(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id))
    await deleteTodo(id)
  }

  async function handleMove(id: string, dir: 'up' | 'down') {
    await moveTodo(id, dir, todos)
    await load()
  }

  async function handleAddReminder() {
    if (!user || !reminderDraft.trim()) { setAddingReminder(false); setReminderDraft(''); return }
    const r = await addReminder(user.id, reminderDraft.trim(), cat, 'medium')
    setReminders(prev => [...prev, r])
    setReminderDraft('')
    setAddingReminder(false)
  }

  async function handleSnooze(id: string) {
    setReminders(prev => prev.filter(r => r.id !== id))
    await snoozeReminder(id)
  }

  async function handleCompleteReminder(id: string) {
    setReminders(prev => prev.filter(r => r.id !== id))
    await completeReminder(id)
  }

  async function handleDeleteReminder(id: string) {
    setReminders(prev => prev.filter(r => r.id !== id))
    await deleteReminder(id)
  }

  return (
    <div style={{ position: 'relative', zIndex: 10, overflowX: 'hidden', background: C.paper, minHeight: '100%' }}>

      {/* Masthead */}
      <div style={{
        ...(bgPhoto ? { background: `url(${bgPhoto}) center/cover no-repeat` } : { background: C.dark }),
        padding: 'calc(env(safe-area-inset-top, 0px) + 56px) 18px 18px', position: 'relative', overflow: 'hidden', minHeight: bgPhoto ? 200 : 'auto',
      }}>
        {bgPhoto && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(26,18,8,0.72) 0%, rgba(26,18,8,0.55) 45%, rgba(26,18,8,0.90) 78%, #FBF7EC 100%)',
          }} />
        )}
        <div style={{ position: 'relative', zIndex: 1, color: C.cream }}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.25em', opacity: 0.7 }}>◆ THE PORTFOLIO</div>
          <div className="badge" style={{ fontSize: 'var(--fs-56)', lineHeight: 0.88, marginTop: 6, letterSpacing: '0.005em' }}>LISTS.</div>
          <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.6, marginTop: 6, letterSpacing: '0.1em' }}>
            {isTodoTab && todos.length > 0 ? `${todos.length} OPEN · ${done.length} DONE` : 'KEEP ALL FIVE LIT'}
          </div>
        </div>
      </div>

      {!bgPhoto && (
        <div style={{ height: 20, background: `linear-gradient(180deg, ${C.dark} 0%, ${C.paper} 100%)` }} />
      )}

      <div style={{ padding: '0 14px' }}>

        {/* Persistent reminders */}
        {isTodoTab && (reminders.length > 0 || addingReminder) && (
          <div style={{ marginBottom: 12 }}>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em', color: C.rust, marginBottom: 6 }}>
              ● DAILY REMINDERS
            </div>
            {reminders.map(r => (
              <div key={r.id} style={{
                position: 'relative', marginBottom: 6,
                display: 'flex', alignItems: 'center',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                  background: r.urgency === 'high' ? C.rust : C.sand, borderRadius: '4px 0 0 4px',
                }} />
                <div style={{
                  flex: 1, marginLeft: 4,
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: r.urgency === 'high' ? 'rgba(196,82,42,0.06)' : '#fff',
                  border: `0.5px solid ${r.urgency === 'high' ? 'rgba(196,82,42,0.25)' : C.ink20}`,
                  borderLeft: 'none', borderRadius: '0 12px 12px 0',
                  padding: '9px 12px',
                }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-15)', color: C.dark, lineHeight: 1.4, wordBreak: 'break-word' }}>{r.title}</span>
                  <button onClick={() => handleSnooze(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--fs-11)', color: C.ink40, padding: '2px 4px' }}>zzz</button>
                  <button onClick={() => handleCompleteReminder(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--fs-14)', color: C.teal, padding: '2px 4px' }}>✓</button>
                  <button onClick={() => handleDeleteReminder(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--fs-16)', color: C.ink40, padding: '2px 4px' }}>×</button>
                </div>
              </div>
            ))}
            {addingReminder ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fff', border: `1.5px solid ${C.rust}`, borderRadius: 12, padding: '8px 12px', marginBottom: 6 }}>
                <input
                  autoFocus
                  value={reminderDraft}
                  onChange={e => setReminderDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddReminder(); if (e.key === 'Escape') { setAddingReminder(false); setReminderDraft('') } }}
                  placeholder="Daily reminder…"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 'var(--fs-15)', background: 'transparent', fontFamily: 'inherit' }}
                />
                <button onClick={handleAddReminder} style={{ background: C.rust, color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer' }}>Add</button>
                <button onClick={() => { setAddingReminder(false); setReminderDraft('') }} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-16)', cursor: 'pointer' }}>×</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingReminder(true)}
                style={{ background: 'none', border: 'none', color: C.rust, fontSize: 'var(--fs-13)', cursor: 'pointer', padding: '2px 0 8px', fontWeight: 600 }}
              >
                + reminder
              </button>
            )}
          </div>
        )}
        {isTodoTab && reminders.length === 0 && !addingReminder && (
          <div style={{ textAlign: 'right', marginBottom: 8 }}>
            <button onClick={() => setAddingReminder(true)} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-13)', cursor: 'pointer', fontWeight: 600 }}>
              + reminder
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id)
                  if (t.id !== 'training' && t.id !== 'projects' && t.id !== 'career') setCat(t.id as TodoCategory)
                  setShowDone(false)
                }}
                style={{
                  flex: '1 1 0%', minWidth: 0,
                  padding: '7px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 'var(--fs-12)', fontWeight: 700,
                  fontFamily: 'Sora, system-ui, sans-serif',
                  letterSpacing: '0.02em', overflow: 'hidden',
                  background: active ? t.color : C.ink20,
                  color: active ? '#fff' : C.ink60,
                  transition: 'background 0.15s, color 0.15s',
                  position: 'relative',
                }}
              >
                {t.label.toUpperCase()}
                {active && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: '20%', right: '20%',
                    height: 2, background: 'rgba(255,255,255,0.5)', borderRadius: 1,
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Special views */}
        {tab === 'training' && <TrainingView />}
        {tab === 'career'   && <CareerView />}
        {tab === 'projects' && <ProjectsView />}

        {/* List */}
        {!isTodoTab ? null :
        <div style={{ paddingBottom: 140 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: C.ink40, fontSize: 'var(--fs-15)' }}>
              Loading…
            </div>
          ) : todos.length === 0 && !adding ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.ink40, fontSize: 'var(--fs-15)', lineHeight: 1.6 }}>
              No open items in {current.label}.<br />
              <button
                onClick={() => setAdding(true)}
                style={{ background: 'none', border: 'none', color: current.color, fontWeight: 700, cursor: 'pointer', fontSize: 'var(--fs-15)', marginTop: 8 }}
              >
                + Add one
              </button>
            </div>
          ) : (
            todos.map((t, i) => (
              <TodoRow
                key={t.id}
                todo={t}
                accent={current.color}
                isFirst={i === 0}
                isLast={i === todos.length - 1}
                onComplete={() => handleComplete(t.id)}
                onDelete={() => handleDelete(t.id)}
                onMove={dir => handleMove(t.id, dir)}
                onUrgencyChange={u => handleUrgencyChange(t.id, u)}
              />
            ))
          )}

          {/* Add input */}
          {adding ? (
            <div style={{ position: 'relative', marginTop: 8 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                background: current.color, borderRadius: '4px 0 0 4px',
              }} />
              <div style={{
                marginLeft: 4,
                background: '#fff', border: `1.5px solid ${current.color}`,
                borderLeft: 'none', borderRadius: '0 14px 14px 0',
                padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setDraft('') } }}
                    placeholder={`Add to ${current.label}…`}
                    style={{
                      flex: 1, border: 'none', outline: 'none', fontSize: 'var(--fs-16)',
                      background: 'transparent', color: C.dark, fontFamily: 'inherit',
                    }}
                  />
                  <button onClick={handleAdd} style={{ background: current.color, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 'var(--fs-14)', fontWeight: 700, cursor: 'pointer' }}>
                    Add
                  </button>
                  <button onClick={() => { setAdding(false); setDraft('') }} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-18)', cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, letterSpacing: '0.12em' }}>PRIORITY:</span>
                  <UrgencySelector value={draftUrgency} onChange={setDraftUrgency} />
                </div>
              </div>
            </div>
          ) : (
            todos.length > 0 && (
              <button
                onClick={() => setAdding(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginTop: 8, padding: '10px 14px', borderRadius: 14,
                  border: `1px dashed ${C.ink20}`, background: 'transparent',
                  color: C.ink60, fontSize: 'var(--fs-15)', cursor: 'pointer', width: '100%',
                }}
              >
                <span style={{ fontSize: 'var(--fs-16)', color: current.color }}>+</span> Add to {current.label}
              </button>
            )
          )}

          {/* Completed */}
          {done.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => setShowDone(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  color: C.ink40, fontSize: 'var(--fs-13)', fontWeight: 600,
                  letterSpacing: '0.06em', fontFamily: 'Sora, system-ui, sans-serif',
                  padding: '4px 0', width: '100%',
                }}
              >
                <span style={{ flex: 1, height: 1, background: C.ink20, display: 'inline-block' }} />
                DONE ({done.length}) {showDone ? '▲' : '▼'}
                <span style={{ flex: 1, height: 1, background: C.ink20, display: 'inline-block' }} />
              </button>
              {showDone && done.map(t => (
                <div key={t.id} style={{
                  position: 'relative', marginBottom: 6, opacity: 0.5,
                }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                    background: current.color, borderRadius: '4px 0 0 4px', opacity: 0.4,
                  }} />
                  <div style={{
                    marginLeft: 4,
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: '#fff', border: `0.5px solid ${C.ink20}`,
                    borderLeft: 'none', borderRadius: '0 12px 12px 0',
                  }}>
                    <span style={{ fontSize: 'var(--fs-15)', color: current.color }}>✓</span>
                    <span style={{ fontSize: 'var(--fs-15)', textDecoration: 'line-through', color: C.ink60 }}>{t.title}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>}
      </div>
    </div>
  )
}

function TodoRow({
  todo, accent, isFirst, isLast, onComplete, onDelete, onMove, onUrgencyChange,
}: {
  todo: Todo
  accent: string
  isFirst: boolean
  isLast: boolean
  onComplete: () => void
  onDelete: () => void
  onMove: (dir: 'up' | 'down') => void
  onUrgencyChange: (u: TodoUrgency) => void
}) {
  const urg = URGENCY[todo.urgency ?? 'deck']
  const isFire = todo.urgency === 'fire'
  const isRain = todo.urgency === 'rain'

  return (
    <div style={{
      position: 'relative', marginBottom: 8,
      opacity: isRain ? 0.65 : 1,
      transition: 'opacity 0.2s',
    }}>
      {/* Category strap — thicker + glow for fire */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: isFire ? 5 : 4,
        background: isFire ? `linear-gradient(180deg, ${accent}, #E8703A)` : accent,
        borderRadius: '4px 0 0 4px',
        boxShadow: isFire ? `2px 0 8px ${accent}55` : 'none',
      }} />
      <div style={{
        marginLeft: 4,
        background: urg.rowBg,
        border: isFire
          ? `0.5px solid rgba(196,82,42,0.25)`
          : `0.5px solid ${C.ink20}`,
        borderLeft: 'none', borderRadius: '0 14px 14px 0',
        padding: '12px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Check */}
          <button
            onClick={onComplete}
            style={{
              width: 22, height: 22, borderRadius: 6,
              border: `2px solid ${isFire ? accent : C.ink20}`,
              background: 'transparent', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          />

          {/* Title */}
          <span style={{
            flex: 1, minWidth: 0,
            fontSize: 'var(--fs-16)', lineHeight: 1.4, color: C.dark,
            wordBreak: 'break-word',
            fontWeight: isFire ? 600 : 400,
          }}>
            {todo.title}
          </span>

          {/* Urgency chip */}
          <UrgencyChip urgency={todo.urgency ?? 'deck'} onChange={onUrgencyChange} />

          {/* Reorder */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
            <button onClick={() => onMove('up')} disabled={isFirst} style={{ background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer', color: isFirst ? C.ink20 : C.ink40, fontSize: 'var(--fs-12)', lineHeight: 1, padding: '1px 3px' }}>▲</button>
            <button onClick={() => onMove('down')} disabled={isLast} style={{ background: 'none', border: 'none', cursor: isLast ? 'default' : 'pointer', color: isLast ? C.ink20 : C.ink40, fontSize: 'var(--fs-12)', lineHeight: 1, padding: '1px 3px' }}>▼</button>
          </div>

          {/* Delete */}
          <button onClick={onDelete} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-17)', cursor: 'pointer', lineHeight: 1, flexShrink: 0, padding: '0 2px' }}>×</button>
        </div>
      </div>
    </div>
  )
}
