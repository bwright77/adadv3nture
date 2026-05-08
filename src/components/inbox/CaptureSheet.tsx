import { useState, useEffect, useRef } from 'react'
import { CardLabel } from '../ui/CardLabel'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { addInboxItem, getInboxItems, type InboxItem } from '../../lib/inbox'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
const hasSpeech = !!SpeechRecognition

interface CaptureSheetProps {
  onClose: () => void
}

export function CaptureSheet({ onClose }: CaptureSheetProps) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [recent, setRecent] = useState<InboxItem[]>([])
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    textareaRef.current?.focus()
    if (user) {
      getInboxItems(user.id).then(items => setRecent(items.slice(0, 3))).catch(() => null)
    }
  }, [user])

  function startListening() {
    if (!hasSpeech || listening) return
    const rec = new SpeechRecognition()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    recognitionRef.current = rec

    rec.onstart = () => { setListening(true); setInterim('') }

    rec.onresult = (e: any) => {
      let final = ''
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interimText += t
      }
      if (final) {
        setText(prev => {
          const joined = prev.trim() ? prev.trimEnd() + ' ' + final : final
          return joined.charAt(0).toUpperCase() + joined.slice(1)
        })
        setInterim('')
      } else {
        setInterim(interimText)
      }
    }

    rec.onerror = () => { setListening(false); setInterim('') }
    rec.onend = () => { setListening(false); setInterim('') }

    rec.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
  }

  useEffect(() => () => recognitionRef.current?.abort(), [])

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

        {/* Interim speech preview */}
        {interim && (
          <div style={{
            fontSize: 15, color: C.ink40, fontStyle: 'italic',
            lineHeight: 1.4, marginBottom: 6, paddingBottom: 6,
            borderBottom: `0.5px dashed ${C.ink20}`,
          }}>
            {interim}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          {hasSpeech && (
            <button
              onPointerDown={startListening}
              onPointerUp={stopListening}
              onPointerLeave={stopListening}
              style={{
                width: 44, height: 44, borderRadius: 22, border: 'none',
                cursor: 'pointer', flexShrink: 0,
                background: listening ? C.rust : C.ink20,
                color: listening ? C.cream : C.ink60,
                fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
                boxShadow: listening ? `0 0 0 4px ${C.rust}44` : 'none',
              }}
            >
              🎙
            </button>
          )}
          <div style={{ flex: 1, fontSize: 11, color: C.ink60 }}>
            {listening ? 'listening…' : hasSpeech ? 'hold mic to speak' : '⌘↵ to save'}
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
