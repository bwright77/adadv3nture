import type { ReactNode } from 'react'
import { C } from '../../tokens'

interface CardLabelProps {
  children: ReactNode
  dark?: boolean
}

export function CardLabel({ children, dark }: CardLabelProps) {
  return (
    <div className="badge" style={{
      fontSize: 'var(--fs-14)',
      letterSpacing: '0.14em',
      color: dark ? 'rgba(245,237,214,0.6)' : C.ink60,
      marginBottom: 6,
    }}>
      {children}
    </div>
  )
}
