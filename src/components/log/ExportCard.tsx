import { useState } from 'react'
import { C } from '../../tokens'
import { useAuth } from '../../contexts/AuthContext'
import { exportToMarkdown, downloadMarkdown } from '../../lib/dataExport'

type Window = '90d' | 'all'

export function ExportCard() {
  const { user } = useAuth()
  const [window, setWindow] = useState<Window>('90d')
  const [busy, setBusy] = useState(false)
  const [lastExportedAt, setLastExportedAt] = useState<string | null>(null)

  async function handleExport() {
    if (!user) return
    setBusy(true)
    try {
      const md = await exportToMarkdown(user.id, {
        windowDays: window === 'all' ? 'all' : 90,
      })
      const date = new Date().toISOString().substring(0, 10)
      downloadMarkdown(`adadv3nture-${date}-${window}.md`, md)
      setLastExportedAt(new Date().toLocaleTimeString())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="mono" style={{
        fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em',
        color: C.ink40, marginBottom: 8, marginTop: 8,
      }}>◆ EXPORT</div>

      <div style={{
        background: '#fff', border: `0.5px solid ${C.ink20}`,
        borderRadius: 14, padding: '14px 16px',
      }}>
        <div style={{ fontSize: 'var(--fs-13)', color: C.dark, lineHeight: 1.4, marginBottom: 10 }}>
          Download a Markdown snapshot to upload into a Claude conversation —
          identity, anchors, training, projects, recent body metrics, recovery,
          activities, reviews, and briefings, all in one file.
        </div>

        {/* Window toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['90d', 'all'] as Window[]).map(w => {
            const selected = window === w
            return (
              <button
                key={w}
                onClick={() => setWindow(w)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 8,
                  background: selected ? C.dark : 'transparent',
                  color: selected ? C.cream : C.ink60,
                  border: `1px solid ${selected ? C.dark : C.ink20}`,
                  fontFamily: 'inherit', fontSize: 'var(--fs-13)', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {w === '90d' ? 'Last 90 days' : 'All-time'}
              </button>
            )
          })}
        </div>

        <button
          onClick={handleExport}
          disabled={busy || !user}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 10,
            background: C.rust, color: C.cream, border: 'none',
            fontSize: 'var(--fs-14)', fontWeight: 700,
            fontFamily: 'inherit', cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.6 : 1,
            letterSpacing: '0.02em',
          }}
        >
          {busy ? 'Gathering data…' : 'Download Markdown'}
        </button>

        {lastExportedAt && (
          <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink40, marginTop: 6, textAlign: 'center' }}>
            Last exported {lastExportedAt}
          </div>
        )}
      </div>
    </div>
  )
}
