import { useLocation, setLocationOverride, getLocationOverride } from '../../../hooks/useLocation'
import { C } from '../../../tokens'
import type { KnownLocation } from '../../../lib/locations'

// Tap to set your location manually (desktop has no GPS). Cycles
// Denver → Howard → Auto (clear the override, back to GPS / last-known).
const CYCLE: (KnownLocation['slug'] | null)[] = ['denver', 'howard', null]

export function LocationToggle({ dark }: { dark?: boolean }) {
  const { location } = useLocation()
  const override = getLocationOverride()

  function next() {
    const i = CYCLE.indexOf(override)
    setLocationOverride(CYCLE[(i + 1) % CYCLE.length])
  }

  return (
    <button
      onClick={next}
      title="Set location (Denver → Howard → Auto)"
      className="mono"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '2px 7px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 'var(--fs-10)', letterSpacing: '0.04em', whiteSpace: 'nowrap',
        background: 'transparent',
        border: `1px solid ${dark ? 'rgba(245,237,214,0.25)' : C.ink20}`,
        color: dark ? 'rgba(245,237,214,0.75)' : C.ink60,
      }}
    >
      📍 {location.name}{override ? '' : ' · auto'}
    </button>
  )
}
