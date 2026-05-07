import type { CSSProperties, ReactNode } from 'react'
import { C } from '../../tokens'

interface GlassProps {
  children: ReactNode
  dark?: boolean
  span?: number
  pad?: number
  style?: CSSProperties
  onClick?: () => void
}

export function Glass({ children, dark = false, span = 6, pad = 16, style, onClick }: GlassProps) {
  return (
    <div onClick={onClick} style={{
      gridColumn: `span ${span}`,
      background: dark ? 'rgba(20,12,4,0.62)' : 'rgba(251,247,236,0.82)',
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      border: dark
        ? '0.5px solid rgba(255,255,255,0.12)'
        : `0.5px solid ${C.ink20}`,
      borderRadius: 22,
      padding: pad,
      color: dark ? C.cream : C.dark,
      boxShadow: '0 8px 24px -8px rgba(0,0,0,0.18)',
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  )
}
