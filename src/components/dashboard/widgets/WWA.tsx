import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'

interface WWAProps { dark?: boolean }

export function WWA({ dark }: WWAProps) {
  return (
    <Glass dark={dark} span={12} pad={14}>
      <CardLabel dark={dark}>Wright adventures · the meaning</CardLabel>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div>
          <div className="badge" style={{ fontSize: 'var(--fs-15)' }}>REPLY TO JENN · DATA TEAM CALL</div>
          <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.6 }}>PFB · $50–85K · José + Liam on thread</div>
        </div>
        <div style={{
          background: C.rust, color: C.cream,
          fontSize: 'var(--fs-13)', padding: '6px 12px', borderRadius: 999, fontWeight: 600,
        }}>
          open
        </div>
      </div>
      <div style={{
        marginTop: 10, paddingTop: 10,
        borderTop: `0.5px dashed ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(26,18,8,0.18)'}`,
      }}>
        <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.55, display: 'flex', justifyContent: 'space-between' }}>
          <span>GSEMA $50K — assessment draft</span>
          <span>due Fri</span>
        </div>
      </div>
    </Glass>
  )
}
