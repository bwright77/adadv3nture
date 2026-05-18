import type { CSSProperties, ReactNode } from 'react'
import { C } from '../../tokens'

type Tint = 'rust' | 'teal' | 'sand'

interface GlassProps {
  children: ReactNode
  dark?: boolean
  span?: number
  pad?: number
  tint?: Tint
  style?: CSSProperties
  onClick?: () => void
}

// Role-based color washes for dark glass. RGB triplets match tokens.ts so the
// gradient blends the accent into the dark base without losing the noise/blur look.
const TINTS: Record<Tint, { rgb: string; border: string }> = {
  rust: { rgb: '196,82,42',  border: 'rgba(196,82,42,0.45)'  },
  teal: { rgb: '91,188,184', border: 'rgba(91,188,184,0.40)' },
  sand: { rgb: '212,130,74', border: 'rgba(212,130,74,0.45)' },
}

export function Glass({ children, dark = false, span = 6, pad = 16, tint, style, onClick }: GlassProps) {
  const tintCfg = tint ? TINTS[tint] : null
  const darkBg = tintCfg
    ? `linear-gradient(135deg, rgba(${tintCfg.rgb},0.55) 0%, rgba(20,12,4,0.78) 100%)`
    : 'rgba(20,12,4,0.62)'

  return (
    <div onClick={onClick} style={{
      gridColumn: `span ${span}`,
      background: dark ? darkBg : 'rgba(251,247,236,0.82)',
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      border: dark
        ? `0.5px solid ${tintCfg ? tintCfg.border : 'rgba(255,255,255,0.12)'}`
        : `0.5px solid ${C.ink20}`,
      borderRadius: 22,
      padding: pad,
      color: dark ? C.cream : C.dark,
      boxShadow: '0 8px 24px -8px rgba(0,0,0,0.18)',
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>")`,
        opacity: 0.35, mixBlendMode: 'multiply',
      }} />
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </div>
  )
}
