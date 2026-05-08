import { useState, useEffect, useRef } from 'react'
import { CardLabel } from '../ui/CardLabel'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { addInboxItem, getInboxItems, type InboxItem } from '../../lib/inbox'

interface CaptureSheetProps {
  onClose: () => void
}

export function CaptureSheet({ onClose }: CaptureSheetProps) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [recent, setRecent] = useState<InboxItem[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    if (user) {
      getInboxItems(user.id).then(items => setRecent(items.slice(0, 3))).catch(() => null)
    }
  }, [user])

  async function handleSave() {
    if (!text.trim() || !user) { onClose(); return }
    setSaving(true)
    try {
      await addInboxItem(user.id, text)
      onClose()
    } catch {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave()
    if (e.key === 'Escape') onClose()
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 45,
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      <div style={{
        position: 'fixed', left: 12, right: 12, bottom: 12, top: 100,
        background: C.paper, borderRadius: 28, zIndex: 50,
        padding: 22, display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <CardLabel>Brain dump · zero friction</CardLabel>
          <button onClick={onClose} style={{
            fontSize: 18, color: C.ink60, background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          }}>×</button>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="capture anything — routes later, works at 11pm half-asleep"
          style={{
            flex: 1, fontSize: 16,
            color: text ? C.dark : C.ink40,
            lineHeight: 1.5, background: 'none', border: 'none', outline: 'none',
            resize: 'none', fontFamily: 'Sora, system-ui, sans-serif',
          }}
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <div style={{ flex: 1, fontSize: 11, color: C.ink60 }}>
            ⌘↵ to save · esc to cancel
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !text.trim()}
            style={{
              background: text.trim() ? C.rust : C.ink20,
              color: C.cream, fontSize: 13,
              padding: '10px 18px', borderRadius: 22, fontWeight: 600,
              border: 'none', cursor: text.trim() ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
          >
            {saving ? '…' : 'save'}
          </button>
        </div>

        {recent.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `0.5px dashed ${C.ink20}` }}>
            <CardLabel>{recent.length} in inbox</CardLabel>
            {recent.map(item => (
              <div key={item.id} className="mono" style={{ fontSize: 10, padding: '4px 0', color: C.ink60 }}>
                · {item.content}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
