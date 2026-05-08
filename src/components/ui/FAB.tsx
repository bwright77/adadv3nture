import { C } from '../../tokens'

interface FABProps {
  onClick: () => void
}

export function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed', right: 18, bottom: 100, zIndex: 40,
        width: 56, height: 56, borderRadius: 28,
        background: C.rust,
        boxShadow: '0 8px 24px -4px rgba(196,82,42,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.cream, fontSize: 'var(--fs-26)', fontWeight: 300,
        border: 'none', cursor: 'pointer',
      }}
    >
      +
    </button>
  )
}
