import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Header } from '../components/ui/Header'
import { C } from '../tokens'
import { getInboxItems, deleteInboxItem, markProcessed, type InboxItem } from '../lib/inbox'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function InboxPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)

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

  async function handleRoute(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await markProcessed(id)
  }

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <Header
        greeting="Inbox"
        sub={items.length ? `${items.length} ITEMS · ROUTE · DELETE` : 'EMPTY · NOTHING TO TRIAGE'}
        dark={false}
      />
      <div style={{ padding: '0 16px 100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: C.ink40, fontSize: 15 }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.ink40, fontSize: 15, lineHeight: 1.8 }}>
            Inbox zero.<br />
            <span style={{ fontSize: 13 }}>Tap + to capture something.</span>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} style={{
              background: '#fff',
              border: `0.5px solid ${C.ink20}`,
              borderRadius: 16, padding: 14, marginBottom: 10,
            }}>
              <div style={{ fontSize: 15, lineHeight: 1.4, color: C.dark }}>{item.content}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 11.5, color: C.ink60 }}>{timeAgo(item.captured_at)}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleRoute(item.id)}
                    style={{
                      fontSize: 12, padding: '4px 9px', borderRadius: 999,
                      background: C.creamDk, color: C.dark, fontWeight: 600, border: 'none', cursor: 'pointer',
                    }}
                  >↗ route</button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      fontSize: 12, padding: '4px 9px', borderRadius: 999,
                      background: 'transparent', color: C.ink60, fontWeight: 600, border: 'none', cursor: 'pointer',
                    }}
                  >× delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
