import { useState, useEffect, useRef } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { addInboxItem, getInboxItems, type InboxItem } from '../../lib/inbox'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognition = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
const hasSpeech = !!SpeechRecognition

const DOT_COLORS = [C.rust, C.rustDk, C.tealDk, C.sand, C.ink60]

interface CaptureSheetProps {
  onClose: () => void
  onSaved?: () => void
}

export function CaptureSheet({ onClose, onSaved }: CaptureSheetProps) {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      onSaved?.()
      onClose()
    } catch {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave()
    if (e.key === 'Escape') onClose()
  }

  const waveHeights = Array.from({ length: 28 }, (_, i) =>
    8 + Math.abs(Math.sin(i * 0.7)) * 18
  )

  return (
    <>
      {/* Blurred backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 45,
          background: 'rgba(26,18,8,0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      />

      {/* Poster header floating above sheet */}
      <div style={{
        position: 'fixed', left: 22, right: 22, top: 72, zIndex: 48,
        color: C.cream, textAlign: 'center', pointerEvents: 'none',
      }}>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.7, letterSpacing: '0.25em' }}>◆ BRAIN OFFLOAD</div>
        <div className="badge" style={{ fontSize: 'var(--fs-26)', lineHeight: 1, marginTop: 4, letterSpacing: '0.005em' }}>
          WHAT'S RATTLING?
        </div>
      </div>

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 10, right: 10, bottom: 10, top: 160,
        zIndex: 50, display: 'flex', flexDirection: 'column',
      }}>
        {/* Tape strips */}
        <div style={{
          position: 'absolute', top: -10, left: 28, width: 56, height: 16,
          background: 'rgba(213,178,90,0.68)', transform: 'rotate(-4deg)',
          zIndex: 55, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: -10, right: 28, width: 56, height: 16,
          background: 'rgba(213,178,90,0.68)', transform: 'rotate(3deg)',
          zIndex: 55, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', pointerEvents: 'none',
        }} />

        <div style={{
          flex: 1, background: C.paper, borderRadius: 26,
          padding: '20px 22px 18px',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -14px 50px rgba(0,0,0,0.4)',
          position: 'relative', overflow: 'hidden',
          border: `0.5px solid ${C.ink20}`,
        }}>
          {/* Paper grain texture */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>")`,
            opacity: 0.6, mixBlendMode: 'multiply',
          }} />

          {/* Top row: rec indicator + close */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="mono" style={{
              fontSize: 'var(--fs-10)', letterSpacing: '0.22em',
              color: listening ? C.rust : C.ink40, fontWeight: 700,
              transition: 'color 0.2s',
            }}>
              {listening ? '● REC · LISTENING' : '● READY'}
            </div>
            <button onClick={onClose} style={{
              fontSize: 'var(--fs-18)', color: C.ink60,
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            }}>×</button>
          </div>

          {/* Big quote mark + textarea */}
          <div style={{ position: 'relative', flex: 1, marginTop: 16, display: 'flex', flexDirection: 'column' }}>
            <span className="badge" style={{
              position: 'absolute', top: -22, left: -4,
              fontSize: 90, lineHeight: 0.7, color: C.rust, opacity: 0.14,
            }}>"</span>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="capture anything — routes later, works at 11pm half-asleep"
              style={{
                flex: 1, fontSize: 'var(--fs-17)',
                color: text ? C.dark : C.ink40,
                lineHeight: 1.5, background: 'none', border: 'none', outline: 'none',
                resize: 'none', fontFamily: 'Sora, system-ui, sans-serif',
                paddingLeft: 8, position: 'relative', zIndex: 2,
                fontStyle: text ? 'normal' : 'italic',
              }}
            />
            {/* Interim speech preview */}
            {interim && (
              <div style={{
                fontSize: 'var(--fs-16)', color: C.ink40, fontStyle: 'italic',
                lineHeight: 1.4, paddingLeft: 8, position: 'relative', zIndex: 2,
              }}>
                {interim}
              </div>
            )}
          </div>

          {/* Waveform when listening, else invisible spacer */}
          <div style={{
            display: 'flex', gap: 2, alignItems: 'center',
            height: 36, marginTop: 10, padding: '0 2px',
            opacity: listening ? 1 : 0, transition: 'opacity 0.3s',
          }}>
            {waveHeights.map((h, i) => (
              <div key={i} style={{
                flex: 1, height: h,
                background: i < 14 ? C.rust : C.ink40,
                borderRadius: 2,
                opacity: i < 14 ? 1 : 0.45,
              }} />
            ))}
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
            {hasSpeech && (
              <button
                onPointerDown={startListening}
                onPointerUp={stopListening}
                onPointerLeave={stopListening}
                style={{
                  width: 48, height: 48, borderRadius: 24, border: 'none',
                  cursor: 'pointer', flexShrink: 0,
                  background: listening ? C.dark : C.ink20,
                  color: listening ? C.cream : C.ink60,
                  fontSize: 'var(--fs-18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: listening ? `0 4px 12px rgba(26,18,8,0.3)` : 'none',
                  transition: 'background 0.15s, box-shadow 0.15s',
                }}
              >
                🎙
              </button>
            )}
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.dark, fontWeight: 700, letterSpacing: '0.1em' }}>
                WORKS AT 11 PM HALF-ASLEEP
              </div>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60, marginTop: 1 }}>
                {hasSpeech ? 'hold mic to speak' : '⌘↵ to save'} · routes at 9:30 triage
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !text.trim()}
              style={{
                background: text.trim() ? C.rust : C.ink20,
                color: C.cream, fontSize: 'var(--fs-15)',
                padding: '12px 22px', borderRadius: 22, fontWeight: 700,
                border: 'none', cursor: text.trim() ? 'pointer' : 'default',
                letterSpacing: '0.05em',
                boxShadow: text.trim() ? '0 4px 14px rgba(196,82,42,0.4)' : 'none',
                transition: 'background 0.15s, box-shadow 0.15s',
              }}
            >
              {saving ? '…' : 'SAVE ↗'}
            </button>
          </div>

          {/* Recent saves */}
          {recent.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 10px' }}>
                <div style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(to right, rgba(26,18,8,0.2) 0 3px, transparent 3px 6px)' }} />
                <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60, letterSpacing: '0.2em' }}>
                  {recent.length} FROM TONIGHT
                </span>
                <div style={{ flex: 1, height: 1, background: 'repeating-linear-gradient(to right, rgba(26,18,8,0.2) 0 3px, transparent 3px 6px)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recent.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: 1, flexShrink: 0,
                      background: DOT_COLORS[i % DOT_COLORS.length],
                    }} />
                    <span style={{
                      flex: 1, fontSize: 'var(--fs-12)', color: C.dark,
                      fontFamily: '"JetBrains Mono", monospace',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.content}
                    </span>
                    <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink40, flexShrink: 0 }}>
                      {new Date(item.captured_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
