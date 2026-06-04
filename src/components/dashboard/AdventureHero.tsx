import { useState } from 'react'
import { Glass } from '../ui/Glass'
import { C } from '../../tokens'
import { useLocation } from '../../hooks/useLocation'
import { useAdventures } from '../../hooks/useAdventures'
import { AdventureLogSheet } from './AdventureLogSheet'
import { ADVENTURE_META } from '../../lib/adventures'
import { RELIEF_LABEL, type Relief } from '../../lib/locations'
import type { WeekType } from '../../hooks/useSummerMode'

interface Props {
  weekType: WeekType
  setWeekType: (wt: WeekType) => void
  onExitSummer?: () => void
  dark?: boolean
}

const WEEK_TYPES: { id: WeekType; label: string }[] = [
  { id: 'solo', label: 'Solo' },
  { id: 'camp', label: 'Camp' },
  { id: 'weekend', label: 'Weekend' },
]

type Prominence = 'headline' | 'compact' | 'light'

function prominenceFor(weekType: WeekType): Prominence {
  if (weekType === 'solo') return 'headline'    // adventure is THE move
  if (weekType === 'camp') return 'compact'      // kids got theirs at camp; school-year shape
  return 'light'                                 // weekend — loose, deliberately not boxed
}

// The felt center of a summer day — "what adventure are we doing today?!" — lifted
// above the time grid. Structure (the existing View) renders quietly underneath.
export function AdventureHero({ weekType, setWeekType, onExitSummer, dark = true }: Props) {
  const { location } = useLocation()
  const { suggested, gotOutToday, refetch } = useAdventures()
  const [sheetOpen, setSheetOpen] = useState(false)

  const prominence = prominenceFor(weekType)
  // Camp week = daytime free regardless of place; otherwise the place's gradient.
  const relief: Relief | null = weekType === 'camp' ? 'free' : location.relief
  const reliefWord = relief ? RELIEF_LABEL[relief] : null

  const open = () => setSheetOpen(true)
  const headline = prominence === 'headline'

  return (
    <div style={{ gridColumn: 'span 12' }}>
      <Glass dark={dark} span={12} pad={headline ? 18 : 14}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.16em', color: C.sand, marginBottom: headline ? 6 : 3 }}>
              ☀ SUMMER · {weekType.toUpperCase()}{reliefWord ? ` · ${reliefWord}` : ''}
            </div>

            {gotOutToday ? (
              <div className="badge" style={{ fontSize: headline ? 'var(--fs-20)' : 'var(--fs-15)', color: dark ? C.cream : C.dark }}>
                We got out today ✓
              </div>
            ) : (
              <>
                {headline && (
                  <div className="badge" style={{ fontSize: 'var(--fs-20)', color: dark ? C.cream : C.dark, lineHeight: 1.2, marginBottom: 4 }}>
                    What's the adventure today?
                  </div>
                )}
                {suggested ? (
                  <div style={{ fontSize: headline ? 'var(--fs-15)' : 'var(--fs-13)', color: dark ? 'rgba(245,237,214,0.8)' : C.ink60 }}>
                    {ADVENTURE_META[suggested.category].emoji} Idea: <strong style={{ color: dark ? C.cream : C.dark }}>{suggested.name}</strong>
                  </div>
                ) : (
                  <div style={{ fontSize: 'var(--fs-13)', color: dark ? 'rgba(245,237,214,0.6)' : C.ink60 }}>
                    Pick something and get out.
                  </div>
                )}
              </>
            )}
          </div>

          <button onClick={open} style={{
            flexShrink: 0, padding: headline ? '12px 18px' : '8px 14px', borderRadius: 12,
            background: gotOutToday ? 'transparent' : C.rust,
            border: gotOutToday ? `1px solid ${dark ? 'rgba(245,237,214,0.3)' : C.ink20}` : 'none',
            color: gotOutToday ? (dark ? C.cream : C.dark) : '#fff',
            fontSize: 'var(--fs-13)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {gotOutToday ? 'Log another' : 'Log it'}
          </button>
        </div>

        {/* Week-type toggle — the Sunday-set value. Lives here (the summer surface)
            rather than the per-view Header. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
          {WEEK_TYPES.map(wt => {
            const on = wt.id === weekType
            return (
              <button key={wt.id} onClick={() => setWeekType(wt.id)} style={{
                padding: '4px 10px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 'var(--fs-11)', letterSpacing: '0.04em',
                background: on ? (dark ? 'rgba(245,237,214,0.16)' : 'rgba(26,18,8,0.1)') : 'transparent',
                border: `1px solid ${on ? (dark ? 'rgba(245,237,214,0.5)' : C.ink40) : (dark ? 'rgba(245,237,214,0.2)' : C.ink20)}`,
                color: dark ? C.cream : C.dark, opacity: on ? 1 : 0.6,
              }}>
                {wt.label}
              </button>
            )
          })}
          {onExitSummer && (
            <button onClick={onExitSummer} style={{
              marginLeft: 'auto', padding: '4px 8px', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--fs-11)',
              color: dark ? 'rgba(245,237,214,0.5)' : C.ink40,
            }}>
              normal day ›
            </button>
          )}
        </div>
      </Glass>

      {sheetOpen && (
        <AdventureLogSheet
          dark={dark}
          suggested={suggested}
          relief={relief}
          onClose={() => setSheetOpen(false)}
          onSaved={refetch}
        />
      )}
    </div>
  )
}
