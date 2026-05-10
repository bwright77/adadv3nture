import { useState, useEffect } from 'react'
import { C } from '../../tokens'
import { TOD_BLOCKS, type TimeOfDay } from '../../hooks/useTimeOfDay'
import { WEEKEND_BLOCKS, WEEKEND_PICKER_ORDER, type WeekendBlock } from '../../hooks/useDayType'

const TOD_ORDER: TimeOfDay[] = ['morning', 'mid-morning', 'afternoon', 'evening']

interface HeaderProps {
  activeTod: TimeOfDay
  isOverride: boolean
  onSetOverride: (tod: TimeOfDay | null) => void
  dark?: boolean
  // Weekend mode
  weekendBlock?: WeekendBlock
  isWeekendOverride?: boolean
  onSetWeekendBlock?: (wb: WeekendBlock | null) => void
}

function useLiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

function formatGreeting(d: Date): string {
  const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const date = d.getDate()
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const hour = h % 12 || 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${day} ${month} ${date} · ${hour}:${m} ${ampm}`
}

export function Header({
  activeTod, isOverride, onSetOverride, dark = true,
  weekendBlock, isWeekendOverride, onSetWeekendBlock,
}: HeaderProps) {
  const now = useLiveClock()
  const [picking, setPicking] = useState(false)

  const isWeekend = weekendBlock !== undefined
  const block = isWeekend ? WEEKEND_BLOCKS[weekendBlock!] : TOD_BLOCKS[activeTod]
  const showOverride = isWeekend ? !!isWeekendOverride : isOverride

  function handlePick(key: string) {
    if (isWeekend) {
      const wb = key as WeekendBlock
      if (wb === weekendBlock && isWeekendOverride) {
        onSetWeekendBlock?.(null)
      } else if (wb !== weekendBlock) {
        onSetWeekendBlock?.(wb)
      }
    } else {
      const tod = key as TimeOfDay
      if (tod === activeTod && isOverride) {
        onSetOverride(null)
      } else if (tod !== activeTod) {
        onSetOverride(tod)
      }
    }
    setPicking(false)
  }

  function handleRestore() {
    if (isWeekend) {
      onSetWeekendBlock?.(null)
    } else {
      onSetOverride(null)
    }
    setPicking(false)
  }

  const pickerItems = isWeekend
    ? WEEKEND_PICKER_ORDER.map(wb => ({ key: wb, ...WEEKEND_BLOCKS[wb] }))
    : TOD_ORDER.map(tod => ({ key: tod, ...TOD_BLOCKS[tod] }))

  // Both evening blocks map to the same picker pill
  const activeKey = isWeekend
    ? (weekendBlock === 'weekend-evening-sun' ? 'weekend-evening-sat' : weekendBlock!)
    : activeTod

  return (
    <div style={{ padding: '10px 20px 14px', color: dark ? C.cream : C.dark }}>
      <div className="badge" style={{ fontSize: 'var(--fs-13)', letterSpacing: '0.2em', opacity: 0.65 }}>
        ADADV3NTURE
      </div>
      <div className="badge" style={{ fontSize: 'var(--fs-26)', lineHeight: 1.1, marginTop: 2 }}>
        {formatGreeting(now)}
      </div>

      <button
        onClick={() => setPicking(p => !p)}
        style={{
          background: 'none', border: 'none', padding: '4px 0 0', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          color: dark ? C.cream : C.dark,
          fontFamily: 'inherit',
        }}
      >
        <span className="mono" style={{ fontSize: 'var(--fs-13)', opacity: showOverride ? 1 : 0.7 }}>
          {block.sub}
        </span>
        {showOverride && (
          <span className="mono" style={{
            fontSize: 'var(--fs-10)', padding: '2px 6px', borderRadius: 999,
            background: C.rust, color: C.cream, letterSpacing: '0.1em',
          }}>
            OVERRIDE
          </span>
        )}
        <span style={{ fontSize: 'var(--fs-11)', opacity: 0.45 }}>{picking ? '▲' : '▾'}</span>
      </button>

      {picking && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {pickerItems.map(item => {
            const isActive = item.key === activeKey
            return (
              <button
                key={item.key}
                onClick={() => handlePick(item.key)}
                style={{
                  padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                  background: isActive
                    ? (showOverride ? C.rust : 'rgba(255,255,255,0.25)')
                    : 'rgba(255,255,255,0.1)',
                  border: isActive
                    ? `1.5px solid ${showOverride ? C.rust : 'rgba(255,255,255,0.6)'}`
                    : '1.5px solid rgba(255,255,255,0.2)',
                  color: dark ? C.cream : C.dark,
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                <div className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.1em', fontWeight: isActive ? 700 : 400 }}>
                  {item.label}
                </div>
                <div className="mono" style={{ fontSize: 9, opacity: 0.6, marginTop: 1 }}>
                  {item.time}
                </div>
              </button>
            )
          })}
          {showOverride && (
            <button
              onClick={handleRestore}
              style={{
                padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                background: 'transparent',
                border: '1.5px dashed rgba(255,255,255,0.3)',
                color: dark ? 'rgba(255,255,255,0.5)' : C.ink40,
                fontFamily: 'inherit',
              }}
            >
              <div className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.1em' }}>LIVE</div>
              <div className="mono" style={{ fontSize: 9, opacity: 0.6, marginTop: 1 }}>RESTORE</div>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
