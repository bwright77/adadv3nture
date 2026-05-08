import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Header } from '../components/ui/Header'
import { C } from '../tokens'
import {
  getTodos, getCompletedTodos, addTodo, completeTodo, deleteTodo, moveTodo,
  type Todo, type TodoCategory,
} from '../lib/todos'

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

  const current = CATEGORIES.find(c => c.id === cat)!

  async function load() {
    if (!user) return
    setLoading(true)
    const [open, closed] = await Promise.all([
      getTodos(user.id, cat),
      getCompletedTodos(user.id, cat),
    ])
    setTodos(open)
    setDone(closed)
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

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <Header greeting="Lists" sub="" dark={false} />

      {/* Category tabs */}
      <div style={{
        display: 'flex', gap: 8, padding: '0 16px 16px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => { setCat(c.id); setShowDone(false) }}
            style={{
              flexShrink: 0,
              padding: '6px 16px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'Sora, system-ui, sans-serif',
              letterSpacing: '0.04em',
              background: cat === c.id ? c.color : C.ink20,
              color: cat === c.id ? '#fff' : C.ink60,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {c.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: '0 16px 140px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.ink40, fontSize: 13 }}>
            Loading…
          </div>
        ) : todos.length === 0 && !adding ? (
          <div style={{
            textAlign: 'center', padding: '40px 0',
            color: C.ink40, fontSize: 13, lineHeight: 1.6,
          }}>
            No open items in {current.label}.<br />
            <button
              onClick={() => setAdding(true)}
              style={{ background: 'none', border: 'none', color: current.color, fontWeight: 700, cursor: 'pointer', fontSize: 13, marginTop: 8 }}
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
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#fff', border: `1.5px solid ${current.color}`,
            borderRadius: 14, padding: '10px 14px', marginTop: 8,
          }}>
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setDraft('') } }}
              placeholder={`Add to ${current.label}…`}
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 14,
                background: 'transparent', color: C.dark, fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleAdd}
              style={{
                background: current.color, color: '#fff', border: 'none',
                borderRadius: 8, padding: '5px 12px', fontSize: 12,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setDraft('') }}
              style={{ background: 'none', border: 'none', color: C.ink40, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        ) : (
          todos.length > 0 && (
            <button
              onClick={() => setAdding(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginTop: 8, padding: '10px 14px', borderRadius: 14,
                border: `1px dashed ${C.ink20}`, background: 'transparent',
                color: C.ink60, fontSize: 13, cursor: 'pointer', width: '100%',
              }}
            >
              <span style={{ fontSize: 16, color: current.color }}>+</span> Add to {current.label}
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
                color: C.ink40, fontSize: 11, fontWeight: 600,
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
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', marginBottom: 6,
                background: '#fff', border: `0.5px solid ${C.ink20}`,
                borderRadius: 12, opacity: 0.5,
              }}>
                <span style={{ fontSize: 14, color: current.color }}>✓</span>
                <span style={{ fontSize: 13, textDecoration: 'line-through', color: C.ink60 }}>{t.title}</span>
              </div>
            ))}
          </div>
        )}
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
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#fff', border: `0.5px solid ${C.ink20}`,
      borderRadius: 14, padding: '12px 14px', marginBottom: 8,
    }}>
      {/* Check */}
      <button
        onClick={onComplete}
        style={{
          width: 22, height: 22, borderRadius: 6,
          border: `2px solid ${accent}`, background: 'transparent',
          cursor: 'pointer', flexShrink: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
      />

      {/* Title */}
      <span style={{ flex: 1, fontSize: 14, lineHeight: 1.4, color: C.dark }}>
        {todo.title}
      </span>

      {/* Reorder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
        <button
          onClick={() => onMove('up')}
          disabled={isFirst}
          style={{
            background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer',
            color: isFirst ? C.ink20 : C.ink40, fontSize: 10, lineHeight: 1, padding: '1px 3px',
          }}
        >▲</button>
        <button
          onClick={() => onMove('down')}
          disabled={isLast}
          style={{
            background: 'none', border: 'none', cursor: isLast ? 'default' : 'pointer',
            color: isLast ? C.ink20 : C.ink40, fontSize: 10, lineHeight: 1, padding: '1px 3px',
          }}
        >▼</button>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{
          background: 'none', border: 'none', color: C.ink40,
          fontSize: 17, cursor: 'pointer', lineHeight: 1, flexShrink: 0,
          padding: '0 2px',
        }}
      >×</button>
    </div>
  )
}
