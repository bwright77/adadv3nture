import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'

interface WBriefingProps {
  dark?: boolean
  text: string | null
  loading: boolean
}

export function WBriefing({ dark = true, text, loading }: WBriefingProps) {
  const wordCount = text ? text.split(/\s+/).length : 0

  return (
    <Glass dark={dark} span={12} pad={18}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <CardLabel dark={dark}>Morning brief</CardLabel>
        {text && (
          <span className="mono" style={{ fontSize: 10, color: dark ? 'rgba(245,237,214,0.5)' : C.ink40 }}>
            claude · {wordCount}w
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ opacity: 0.4, fontSize: 13, marginTop: 8 }}>Generating your briefing…</div>
      ) : !text ? (
        <div style={{ opacity: 0.4, fontSize: 13, marginTop: 8 }}>No briefing today.</div>
      ) : (
        <div style={{
          fontSize: 14, lineHeight: 1.55,
          color: dark ? C.cream : C.dark,
          marginTop: 6,
        }}>
          {text}
        </div>
      )}
    </Glass>
  )
}
