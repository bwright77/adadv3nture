import { Header } from '../components/ui/Header'
import { C } from '../tokens'

interface InboxItem {
  t: string
  w: string
  c: string
}

const ITEMS: InboxItem[] = [
  { t: 'FJ62 fan clutch — order before Howard',    w: '11pm',     c: 'truck' },
  { t: 'ask Tangier about Italy → bike rental',    w: '10:42pm',  c: 'personal' },
  { t: 'Sylvia school form due Friday',            w: '10:30pm',  c: 'deadline' },
  { t: 'GSEMA — pull 2024 case study quotes',      w: 'yest 4:15',c: 'wa' },
  { t: 'fix gate latch',                           w: 'yest 9am', c: 'house' },
]

export function InboxPage() {
  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <Header greeting="Inbox · 9:30 triage" sub="14 ITEMS · ROUTE · MIT · DELETE" dark={false} />
      <div style={{ padding: '0 16px 100px' }}>
        {ITEMS.map((item, i) => (
          <div key={i} style={{
            background: '#fff',
            border: `0.5px solid ${C.ink20}`,
            borderRadius: 16, padding: 14, marginBottom: 10,
          }}>
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>{item.t}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 9.5, color: C.ink60 }}>{item.w}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{
                  fontSize: 10, padding: '4px 9px', borderRadius: 999,
                  background: C.creamDk, color: C.dark, fontWeight: 600, border: 'none', cursor: 'pointer',
                }}>↗ list</button>
                <button style={{
                  fontSize: 10, padding: '4px 9px', borderRadius: 999,
                  background: C.rust, color: C.cream, fontWeight: 600, border: 'none', cursor: 'pointer',
                }}>★ MIT</button>
                <button style={{
                  fontSize: 10, padding: '4px 9px', borderRadius: 999,
                  background: 'transparent', color: C.ink60, fontWeight: 600, border: 'none', cursor: 'pointer',
                }}>×</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
