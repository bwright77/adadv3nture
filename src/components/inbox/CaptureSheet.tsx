import { useState } from 'react'
import { CardLabel } from '../ui/CardLabel'
import { C } from '../../tokens'

interface CaptureSheetProps {
  onClose: () => void
}

const RECENT = [
  'FJ62 fan clutch — order before Howard',
  'Sylvia school form due Friday',
  'ride hurricane → confirm dates',
]

export function CaptureSheet({ onClose }: CaptureSheetProps) {
  const [text, setText] = useState('')

  const handleSave = () => {
    if (text.trim()) setText('')
    onClose()
  }

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 45,
          background: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      {/* sheet */}
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
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="capture anything — routes later, works at 11pm half-asleep"
          style={{
            flex: 1, fontSize: 16, color: text ? C.dark : C.ink40,
            lineHeight: 1.5, background: 'none', border: 'none', outline: 'none',
            resize: 'none', fontFamily: 'Sora, system-ui, sans-serif',
          }}
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <button style={{
            width: 44, height: 44, borderRadius: 22,
            background: C.creamDk, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>
            🎙
          </button>
          <div style={{ flex: 1, fontSize: 11, color: C.ink60 }}>
            routes later · works at 11pm half-asleep
          </div>
          <button
            onClick={handleSave}
            style={{
              background: C.rust, color: C.cream, fontSize: 13,
              padding: '10px 18px', borderRadius: 22, fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}
          >
            save
          </button>
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `0.5px dashed rgba(26,18,8,0.18)` }}>
          <CardLabel>3 saved last night</CardLabel>
          {RECENT.map((t, i) => (
            <div key={i} className="mono" style={{ fontSize: 10, padding: '4px 0', color: C.ink60 }}>
              · {t}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
