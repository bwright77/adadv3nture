import { C } from '../../tokens'

interface RingProps {
  pct: number
  color?: string
  size?: number
  sw?: number
  label?: string
  dark?: boolean
}

export function Ring({ pct, color = C.rust, size = 56, sw = 5, label, dark }: RingProps) {
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={dark ? 'rgba(255,255,255,0.16)' : 'rgba(26,18,8,0.1)'}
          strokeWidth={sw}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={`${circ * pct / 100} ${circ}`}
        />
      </svg>
      {label && (
        <div className="mono" style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700,
        }}>
          {label}
        </div>
      )}
    </div>
  )
}
