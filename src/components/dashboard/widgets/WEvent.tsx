import { Glass } from '../../ui/Glass'
import { C } from '../../../tokens'

interface WEventProps { dark?: boolean }

function daysUntil(target: Date): number {
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000)
}

export function WEvent({ dark }: WEventProps) {
  const days = daysUntil(new Date('2026-09-26'))
  return (
    <Glass dark={dark} span={12} pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 4, height: 36, background: C.rust, borderRadius: 2 }} />
      <div style={{ flex: 1 }}>
        <div className="badge" style={{ fontSize: 'var(--fs-14)' }}>WEST LINE WINDER 30K</div>
        <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.6 }}>
          Sept 26 · Buena Vista · 18.6mi · 48th bday wknd
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 'var(--fs-18)', fontWeight: 700, lineHeight: 1 }}>
          {days}<span style={{ fontSize: 'var(--fs-12)', opacity: 0.5 }}>d</span>
        </div>
        <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.teal }}>register now ↗</div>
      </div>
    </Glass>
  )
}
