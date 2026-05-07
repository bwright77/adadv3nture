import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'

interface WBriefingProps { dark?: boolean }

export function WBriefing({ dark = true }: WBriefingProps) {
  return (
    <Glass dark={dark} span={12} pad={18}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <CardLabel dark={dark}>Morning brief · 7:38</CardLabel>
        <span className="mono" style={{ fontSize: 10, color: dark ? 'rgba(245,237,214,0.5)' : C.ink40 }}>
          claude · 142w
        </span>
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: dark ? C.cream : C.dark, marginTop: 4 }}>
        RHR 61, sleep 84 — green light. Yesterday 0 drinks, ratio holding 0.8/day.{' '}
        <span style={{ color: C.teal, fontWeight: 600 }}>Total Strength W1·D2 today</span>{' '}
        — chest press 25s, slow. Boot camp day 1, ease in.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <div style={{
          background: C.rust, color: C.cream,
          fontSize: 11, padding: '6px 10px', borderRadius: 999, fontWeight: 600,
        }}>
          ↳ Open workout
        </div>
        <span style={{ fontSize: 11, color: dark ? 'rgba(245,237,214,0.55)' : C.ink60 }}>
          then 9:30 triage · 14 in inbox
        </span>
      </div>
    </Glass>
  )
}
