import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { C } from '../tokens'
import {
  getTodos, getCompletedTodos, addTodo, completeTodo, deleteTodo, moveTodo,
  type Todo, type TodoCategory,
} from '../lib/todos'
import {
  getActiveReminders, addReminder, snoozeReminder, completeReminder, deleteReminder,
  type Reminder,
} from '../lib/reminders'

const CATEGORIES: { id: TodoCategory; label: string; color: string }[] = [
  { id: 'body',     label: 'Body',     color: C.teal },
  { id: 'career',   label: 'Career',   color: C.rust },
  { id: 'family',   label: 'Family',   color: C.sand },
  { id: 'home',     label: 'Home',     color: '#8B7355' },
  { id: 'personal', label: 'Personal', color: '#7B9E87' },
]

export function TodosPage() {
  const { user } = useAuth()
  const [cat, setCat] = useState<TodoCategory>('body')
  const [todos, setTodos] = useState<Todo[]>([])
  const [done, setDone] = useState<Todo[]>([])
  const [showDone, setShowDone] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [addingReminder, setAddingReminder] = useState(false)
  const [reminderDraft, setReminderDraft] = useState('')

  const current = CATEGORIES.find(c => c.id === cat)!

  async function load() {
    if (!user) return
    setLoading(true)
    const [open, closed, active] = await Promise.all([
      getTodos(user.id, cat),
      getCompletedTodos(user.id, cat),
      getActiveReminders(user.id),
    ])
    setTodos(open)
    setDone(closed)
    setReminders(active)
    setLoading(false)
  }

  useEffect(() => { load() }, [cat, user])

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  async function handleAdd() {
    if (!user || !draft.trim()) { setAdding(false); setDraft(''); return }
    const item = await addTodo(user.id, cat, draft.trim())
    setTodos(prev => [...prev, item])
    setDraft('')
    setAdding(false)
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
      <div style={{ background: C.dark, padding: '56px 18px 18px', position: 'relative' }}>
        <div style={{ color: C.cream }}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.25em', opacity: 0.7 }}>◆ THE PORTFOLIO</div>
          <div className="badge" style={{ fontSize: 'var(--fs-56)', lineHeight: 0.88, marginTop: 6, letterSpacing: '0.005em' }}>LISTS.</div>
          <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.6, marginTop: 6, letterSpacing: '0.1em' }}>
            {todos.length > 0 ? `${todos.length} OPEN · ${done.length} DONE` : 'KEEP ALL FIVE LIT'}
          </div>
        </div>
      </div>

      {/* Gradient bridge */}
      <div style={{ height: 20, background: `linear-gradient(180deg, ${C.dark} 0%, ${C.paper} 100%)` }} />

      <div style={{ padding: '0 14px' }}>

        {/* Persistent reminders */}
        {(reminders.length > 0 || addingReminder) && (
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
        {reminders.length === 0 && !addingReminder && (
          <div style={{ textAlign: 'right', marginBottom: 8 }}>
            <button onClick={() => setAddingReminder(true)} style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-13)', cursor: 'pointer', fontWeight: 600 }}>
              + reminder
            </button>
          </div>
        )}

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => { setCat(c.id); setShowDone(false) }}
              style={{
                flex: '1 1 0%', minWidth: 0,
                padding: '7px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 'var(--fs-12)', fontWeight: 700,
                fontFamily: 'Sora, system-ui, sans-serif',
                letterSpacing: '0.02em', overflow: 'hidden',
                background: cat === c.id ? c.color : C.ink20,
                color: cat === c.id ? '#fff' : C.ink60,
                transition: 'background 0.15s, color 0.15s',
                position: 'relative',
              }}
            >
              {c.label.toUpperCase()}
              {/* Active underline */}
              {cat === c.id && (
                <div style={{
                  position: 'absolute', bottom: 0, left: '20%', right: '20%',
                  height: 2, background: 'rgba(255,255,255,0.5)', borderRadius: 1,
                }} />
              )}
            </button>
          ))}
        </div>

        {/* List */}
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
              />
            ))
          )}

          {/* Add input */}
          {adding ? (
            <div style={{
              position: 'relative', marginTop: 8,
            }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                background: current.color, borderRadius: '4px 0 0 4px',
              }} />
              <div style={{
                marginLeft: 4,
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: `1.5px solid ${current.color}`,
                borderLeft: 'none', borderRadius: '0 14px 14px 0',
                padding: '10px 14px',
              }}>
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
        </div>
      </div>
    </div>
  )
}

function TodoRow({
  todo, accent, isFirst, isLast, onComplete, onDelete, onMove,
}: {
  todo: Todo
  accent: string
  isFirst: boolean
  isLast: boolean
  onComplete: () => void
  onDelete: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      {/* Category strap */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: accent, borderRadius: '4px 0 0 4px',
      }} />
      <div style={{
        marginLeft: 4,
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff', border: `0.5px solid ${C.ink20}`,
        borderLeft: 'none', borderRadius: '0 14px 14px 0',
        padding: '12px 14px',
      }}>
        {/* Check */}
        <button
          onClick={onComplete}
          style={{
            width: 22, height: 22, borderRadius: 6,
            border: `2px solid ${accent}`, background: 'transparent',
            cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        />

        {/* Title */}
        <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--fs-16)', lineHeight: 1.4, color: C.dark, wordBreak: 'break-word' }}>
          {todo.title}
        </span>

        {/* Reorder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
          <button
            onClick={() => onMove('up')} disabled={isFirst}
            style={{ background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer', color: isFirst ? C.ink20 : C.ink40, fontSize: 'var(--fs-12)', lineHeight: 1, padding: '1px 3px' }}
          >▲</button>
          <button
            onClick={() => onMove('down')} disabled={isLast}
            style={{ background: 'none', border: 'none', cursor: isLast ? 'default' : 'pointer', color: isLast ? C.ink20 : C.ink40, fontSize: 'var(--fs-12)', lineHeight: 1, padding: '1px 3px' }}
          >▼</button>
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 'var(--fs-17)', cursor: 'pointer', lineHeight: 1, flexShrink: 0, padding: '0 2px' }}
        >×</button>
      </div>
    </div>
  )
}
