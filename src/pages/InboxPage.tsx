import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { C } from '../tokens'
import { getInboxItems, deleteInboxItem, type InboxItem } from '../lib/inbox'
import { RouteSheet } from '../components/inbox/RouteSheet'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function categoryFromContent(content: string): { label: string; color: string } {
  const lower = content.toLowerCase()
  if (/truck|fj62|rig|engine|oil|coolant|fan|belt/.test(lower)) return { label: 'TRUCK', color: C.rust }
  if (/sylvia|chase|ada|kids?|school|pickup/.test(lower)) return { label: 'FAMILY', color: C.sand }
  if (/wa|wright adventures?|jenn|pfb|gsema|proposal|invoice/.test(lower)) return { label: 'WRIGHT', color: C.dark }
  if (/house|gate|fence|yard|roof|plumb/.test(lower)) return { label: 'HOUSE', color: '#8B7355' }
  if (/deadline|due|urgent|asap/.test(lower)) return { label: 'DEADLINE', color: C.rustDk }
  return { label: 'PROJECTS', color: C.tealDk }
}

interface InboxPageProps { bgPhoto?: string }

function SwipeableItem({ item, i, onDelete, onRoute }: {
  item: InboxItem, i: number,
  onDelete: () => void, onRoute: () => void,
}) {
  const cat = categoryFromContent(item.content)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const THRESHOLD = 80

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    startX.current = e.clientX
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    setDx(e.clientX - startX.current)
  }
  function onPointerUp() {
    if (dx > THRESHOLD) { setDx(0); onRoute(); return }
    else if (dx < -THRESHOLD) onDelete()
    else setDx(0)
    setDragging(false)
  }

  const progress = Math.min(1, Math.abs(dx) / THRESHOLD)
  const isMIT = dx > 0
  const hintVisible = Math.abs(dx) > 24

  return (
    <div style={{ position: 'relative', marginBottom: 8, transform: `rotate(${i % 2 ? -0.2 : 0.2}deg)` }}>
      {/* Swipe action background */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '0 14px 14px 0', marginLeft: 4,
        background: isMIT
          ? `rgba(91,188,184,${progress * 0.35})`
          : `rgba(196,82,42,${progress * 0.35})`,
        display: 'flex', alignItems: 'center',
        justifyContent: isMIT ? 'flex-start' : 'flex-end',
        padding: '0 16px',
      }}>
        {hintVisible && (
          <span className="mono" style={{
            fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.18em',
            color: isMIT ? C.tealDk : C.rust,
          }}>
            {isMIT ? '★ MIT' : '× DELETE'}
          </span>
        )}
      </div>

      {/* Card */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { setDx(0); setDragging(false) }}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)',
          touchAction: 'pan-y', userSelect: 'none', cursor: 'grab',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: cat.color, borderRadius: '4px 0 0 4px' }} />
        <div style={{
          background: '#fff', border: `0.5px solid ${C.ink20}`, borderLeft: 'none',
          borderRadius: '0 14px 14px 0', padding: '11px 14px', marginLeft: 4,
          boxShadow: '0 2px 8px rgba(26,18,8,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, color: cat.color, letterSpacing: '0.18em' }}>
              ● {cat.label}
            </span>
            <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40 }}>
              {timeAgo(item.captured_at)}
            </span>
          </div>
          <div style={{ fontSize: 'var(--fs-15)', lineHeight: 1.35, color: C.dark }}>{item.content}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
            <ActionChip label="↗ route" bg={C.creamDk} fg={C.dark} onClick={onRoute} />
            <ActionChip label="★ MIT" bg={C.rust} fg={C.cream} onClick={onRoute} />
            <span style={{ flex: 1 }} />
            <button onClick={onDelete} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 'var(--fs-18)', color: C.ink40, padding: '0 4px', lineHeight: 1,
            }}>×</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function InboxPage({ bgPhoto }: InboxPageProps) {
  const { user } = useAuth()
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [routing, setRouting] = useState<InboxItem | null>(null)

  async function load() {
    if (!user) return
    setLoading(true)
    const data = await getInboxItems(user.id)
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  async function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await deleteInboxItem(id)
  }

  function handleRouteDone(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    setRouting(null)
  }

  const count = items.length

  return (
    <div style={{ position: 'relative', zIndex: 10, background: C.paper, minHeight: '100%' }}>

      {/* Dramatic poster header */}
      <div style={{
        ...(bgPhoto ? { background: `url(${bgPhoto}) center/cover no-repeat` } : { background: C.dark }),
        padding: 'calc(env(safe-area-inset-top, 0px) + 56px) 18px 0', position: 'relative', overflow: 'hidden', minHeight: bgPhoto ? 220 : 'auto',
      }}>
        {bgPhoto && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(26,18,8,0.72) 0%, rgba(26,18,8,0.50) 40%, rgba(26,18,8,0.88) 78%, #FBF7EC 100%)',
          }} />
        )}
        {!bgPhoto && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.10 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>")`,
            opacity: 0.7, mixBlendMode: 'multiply',
          }} />
        )}
        <div style={{ position: 'relative', zIndex: 1, color: C.cream }}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.2em', opacity: 0.85 }}>◆ MORNING TRIAGE · 9:30 AM</div>
          <div className="badge" style={{
            fontSize: count >= 10 ? 'var(--fs-56)' : 'var(--fs-56)',
            lineHeight: 0.92, marginTop: 6, letterSpacing: '0.005em',
          }}>
            {count === 0 ? 'INBOX' : count === 1 ? 'ONE' : count === 2 ? 'TWO' : count === 3 ? 'THREE' :
              count === 4 ? 'FOUR' : count === 5 ? 'FIVE' : count === 6 ? 'SIX' : count === 7 ? 'SEVEN' :
              count === 8 ? 'EIGHT' : count === 9 ? 'NINE' : count === 10 ? 'TEN' : String(count)}
            <br />
            <span style={{ opacity: 0.65 }}>OFFLOADS.</span>
          </div>
        </div>

        {/* Stat ribbon */}
        {count > 0 && (
          <div style={{
            margin: '14px 0 0', padding: '10px 14px',
            background: 'rgba(245,237,214,0.08)',
            borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            border: '0.5px solid rgba(245,237,214,0.12)',
          }}>
            <StatChip n={count} label="captured" />
            <Sep />
            <StatChip n={Math.floor(count * 0.3)} label="→ MIT" accent={C.rust} />
            <Sep />
            <StatChip n={Math.floor(count * 0.4)} label="→ lists" />
            <Sep />
            <StatChip n={count - Math.floor(count * 0.3) - Math.floor(count * 0.4)} label="delete" accent={C.sand} />
          </div>
        )}

        {/* Gradient transition to paper */}
        <div style={{ height: 28 }} />
      </div>

      {!bgPhoto && (
        <div style={{ height: 24, background: `linear-gradient(180deg, ${C.dark} 0%, ${C.paper} 100%)` }} />
      )}

      {routing && (
        <RouteSheet
          item={routing}
          onDone={handleRouteDone}
          onClose={() => setRouting(null)}
        />
      )}

      <div style={{ padding: '0 14px 100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.ink40, fontSize: 'var(--fs-15)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.ink40, fontSize: 'var(--fs-15)', lineHeight: 1.8 }}>
            Inbox zero.<br />
            <span style={{ fontSize: 'var(--fs-13)' }}>Tap + to capture something.</span>
          </div>
        ) : (
          <>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60, letterSpacing: '0.2em', padding: '4px 0 10px' }}>
              TAP ROUTE · TAP × TO DELETE
            </div>
            {items.map((item, i) => (
              <SwipeableItem
                key={item.id}
                item={item}
                i={i}
                onDelete={() => handleDelete(item.id)}
                onRoute={() => setRouting(item)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function StatChip({ n, label, accent }: { n: number; label: string; accent?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="badge" style={{ fontSize: 'var(--fs-22)', lineHeight: 1, color: accent || C.cream }}>{n}</div>
      <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.7, letterSpacing: '0.15em', marginTop: 2 }}>
        {label.toUpperCase()}
      </div>
    </div>
  )
}

function Sep() {
  return <div style={{ width: 1, height: 22, background: 'rgba(245,237,214,0.18)' }} />
}

function ActionChip({ label, bg, fg, onClick }: { label: string; bg: string; fg: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 'var(--fs-11)', padding: '5px 10px', borderRadius: 999,
        background: bg, color: fg, fontWeight: 600, border: 'none', cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
