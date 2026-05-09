import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'

type ListTab = 'training' | 'career' | 'family' | 'home' | 'projects'

interface WPilotsProps {
  dark?: boolean
  onNavigate?: (tab: ListTab) => void
}

const PILOTS: { n: string; v: number; d: string; tab: ListTab }[] = [
  { n: 'BODY',     v: 1,   d: 'today',     tab: 'training' },
  { n: 'CAREER',   v: 1,   d: 'yesterday', tab: 'career' },
  { n: 'FAMILY',   v: 0.5, d: '3d',        tab: 'family' },
  { n: 'HOME',     v: 0.2, d: '9d',        tab: 'home' },
  { n: 'PROJECTS', v: 0.7, d: '2d',        tab: 'projects' },
]

export function WPilots({ dark, onNavigate }: WPilotsProps) {
  return (
    <Glass dark={dark} span={12} pad={14}>
      <CardLabel dark={dark}>Pilot lights · keep them all lit</CardLabel>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {PILOTS.map(l => (
          <button
            key={l.n}
            onClick={() => onNavigate?.(l.tab)}
            style={{
              textAlign: 'center', flex: 1, background: 'none', border: 'none',
              cursor: onNavigate ? 'pointer' : 'default', padding: '4px 0',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ width: 22, height: 28, margin: '0 auto', position: 'relative' }}>
              <svg viewBox="0 0 24 32" width="22" height="28">
                <path
                  d="M12 2 C 16 8, 20 12, 20 20 C 20 26, 16 30, 12 30 C 8 30, 4 26, 4 20 C 4 12, 8 8, 12 2 Z"
                  fill={l.v > 0.6 ? C.rust : l.v > 0.3 ? C.sand : 'rgba(150,130,100,0.4)'}
                  opacity={0.4 + l.v * 0.6}
                />
                <path
                  d="M12 8 C 14 12, 16 14, 16 19 C 16 23, 14 26, 12 26 C 10 26, 8 23, 8 19 C 8 14, 10 12, 12 8 Z"
                  fill={l.v > 0.6 ? '#FFD27A' : '#E8C99A'}
                  opacity={l.v > 0.3 ? 1 : 0.3}
                />
              </svg>
            </div>
            <div className="badge" style={{ fontSize: 'var(--fs-11)', marginTop: 2, color: dark ? C.cream : C.dark }}>{l.n}</div>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.55, color: dark ? C.cream : C.dark }}>{l.d}</div>
          </button>
        ))}
      </div>
    </Glass>
  )
}
