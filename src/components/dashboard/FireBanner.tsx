import { useEffect, useState } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { getFireTodos } from '../../lib/todos'
import type { Todo, TodoCategory } from '../../lib/todos'

interface Props {
  onOpen?: (category: TodoCategory) => void
}

// Summer watcher: a fire-flagged todo is the one thing allowed to pierce the
// vibe, any day-type. Quiet (renders nothing) when nothing's on fire.
export function FireBanner({ onOpen }: Props) {
  const { user } = useAuth()
  const [fires, setFires] = useState<Todo[]>([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getFireTodos(user.id)
      .then(t => { if (!cancelled) setFires(t) })
      .catch(() => { if (!cancelled) setFires([]) })
    return () => { cancelled = true }
  }, [user])

  if (fires.length === 0) return null
  const top = fires[0]
  const extra = fires.length - 1

  return (
    <div style={{ gridColumn: 'span 12' }}>
      <button
        onClick={() => onOpen?.(top.category)}
        style={{
          width: '100%', textAlign: 'left', cursor: onOpen ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 14,
          background: 'rgba(196,82,42,0.16)',
          border: `1px solid ${C.rust}`,
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>🔥</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.14em', color: C.rust }}>
            ON FIRE{extra > 0 ? ` · +${extra} MORE` : ''}
          </div>
          <div className="badge" style={{
            fontSize: 'var(--fs-14)', color: C.cream,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {top.title}
          </div>
        </div>
        <span style={{ fontSize: 'var(--fs-13)', color: C.rust, opacity: 0.8 }}>→</span>
      </button>
    </div>
  )
}
