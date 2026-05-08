import type { ReactNode } from 'react'
import { C } from '../../tokens'

interface CardLabelProps {
  children: ReactNode
  dark?: boolean
  accent?: string
}

export function CardLabel({ children, dark, accent }: CardLabelProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span style={{
        width: 5, height: 5, borderRadius: 1, flexShrink: 0,
        background: accent ?? C.rust,
      }} />
      <span className="badge" style={{
        fontSize: 'var(--fs-14)',
        letterSpacing: '0.14em',
        color: dark ? 'rgba(245,237,214,0.6)' : C.ink60,
      }}>
        {children}
      </span>
    </div>
  )
}
