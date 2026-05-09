import { C } from '../../tokens'

export type Tab = 'home' | 'trends' | 'inbox' | 'log' | 'lists'

interface TabBarProps {
  active: Tab
  dark?: boolean
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home',   label: 'Today',  icon: '◐' },
  { id: 'trends', label: 'Trends', icon: '▤' },
  { id: 'lists',  label: 'Lists',  icon: '☐' },
  { id: 'inbox',  label: 'Inbox',  icon: '✦' },
  { id: 'log',    label: 'Log',    icon: '≡' },
]

export function TabBar({ active, dark = false, onChange }: TabBarProps) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
      background: dark ? 'rgba(20,12,4,0.78)' : 'rgba(251,247,236,0.88)',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      borderTop: `0.5px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(26,18,8,0.08)'}`,
      display: 'flex',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      paddingTop: 8,
    }}>
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1, textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer',
            color: active === t.id
              ? (dark ? C.teal : C.rust)
              : (dark ? 'rgba(245,237,214,0.45)' : C.ink60),
            padding: 0,
          }}
        >
          <div style={{ fontSize: 'var(--fs-18)', lineHeight: 1 }}>{t.icon}</div>
          <div style={{ fontSize: 'var(--fs-12)', marginTop: 3, fontWeight: 500, fontFamily: 'Sora, system-ui, sans-serif' }}>
            {t.label}
          </div>
        </button>
      ))}
    </div>
  )
}
