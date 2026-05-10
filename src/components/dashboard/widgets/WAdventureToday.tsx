import { useState } from 'react'
import { Glass } from '../../ui/Glass'
import { C } from '../../../tokens'
import { useWeekendPlan } from '../../../hooks/useWeekendPlan'
import { useWeather } from '../../../hooks/useWeather'
import { PlanDaySheet } from './PlanDaySheet'
import type { AdventureType } from '../../../hooks/useWeekendPlan'

interface Props { dark?: boolean }

const TYPE_ICON: Record<AdventureType | 'other', string> = {
  run: '🏃', ride: '🚴', hike: '🥾', ski: '⛷',
  family: '👨‍👩‍👧', project: '🔧', other: '✦',
}


function formatTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'am' : 'pm'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

function Dot() {
  return <span style={{ opacity: 0.3, margin: '0 4px' }}>·</span>
}

export function WAdventureToday({ dark }: Props) {
  const { plan, lastEffort, isLoading, upsertPlan, clearPlan } = useWeekendPlan()
  const { weather } = useWeather()
  const [sheet, setSheet] = useState(false)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).toUpperCase()

  const subColor = dark ? 'rgba(245,237,214,0.55)' : C.ink60
  const labelColor = dark ? 'rgba(245,237,214,0.7)' : C.ink60

  return (
    <>
      <Glass dark={dark} span={12} pad={16}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, background: C.rust, borderRadius: 1 }} />
            <span className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.14em', color: labelColor }}>
              THE DAY'S MOVE
            </span>
          </div>
          <span className="mono" style={{ fontSize: 'var(--fs-10)', color: subColor }}>{today}</span>
        </div>

        {isLoading ? (
          <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.4 }}>Loading…</div>
        ) : plan?.title ? (
          /* ── Planned state ── */
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {plan.activity_type && (
                    <span style={{ fontSize: 20 }}>{TYPE_ICON[plan.activity_type]}</span>
                  )}
                  <span className="badge" style={{
                    fontSize: 'var(--fs-22)', lineHeight: 0.95,
                    color: dark ? C.cream : C.dark,
                  }}>
                    {plan.title}
                  </span>
                </div>

                <div className="mono" style={{ fontSize: 'var(--fs-12)', color: subColor, marginTop: 6 }}>
                  {[
                    plan.location,
                    plan.departure_time ? `Leave ${formatTime(plan.departure_time)}` : null,
                  ].filter(Boolean).join(' · ')}
                </div>

                {plan.notes && (
                  <div className="mono" style={{ fontSize: 'var(--fs-11)', color: subColor, opacity: 0.8, marginTop: 6, fontStyle: 'italic' }}>
                    {plan.notes}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSheet(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: subColor, fontSize: 'var(--fs-16)', flexShrink: 0,
                }}
              >
                ✎
              </button>
            </div>

            {/* Context row */}
            {weather && (
              <div className="mono" style={{
                fontSize: 'var(--fs-11)', color: subColor,
                marginTop: 12, paddingTop: 10,
                borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(26,18,8,0.08)'}`,
              }}>
                {weather.tempF}°{weather.isSnowing ? ' snow' : weather.isRaining ? ' rain' : ` ${weather.description.toLowerCase()}`}
                <Dot />↑{weather.highF}°
                {weather.windMph > 8 && <><Dot />{weather.windMph}mph wind</>}
              </div>
            )}
          </div>
        ) : (
          /* ── Unplanned state ── */
          <div>
            {/* Context prompt */}
            <div className="mono" style={{
              fontSize: 'var(--fs-13)', color: dark ? 'rgba(245,237,214,0.75)' : C.dark,
              lineHeight: 1.55, marginBottom: 16,
            }}>
              {weather && (
                <span>
                  {weather.tempF}°{weather.isSnowing ? ' snow · ' : weather.isRaining ? ' rain · ' : `F ${weather.description.toLowerCase()} · `}
                  ↑{weather.highF}°
                  {weather.windMph > 8 ? ` · ${weather.windMph}mph wind` : ''}
                </span>
              )}
              {weather && (lastEffort || true) && <span style={{ color: subColor }}> · </span>}
              {lastEffort && (
                <span>
                  Last {lastEffort.activity_type}: {lastEffort.daysAgo === 0 ? 'today' : lastEffort.daysAgo === 1 ? 'yesterday' : `${lastEffort.daysAgo}d ago`}
                </span>
              )}
              {!weather && !lastEffort && (
                <span style={{ opacity: 0.4 }}>No plan yet — what's the move?</span>
              )}
            </div>

            <button
              onClick={() => setSheet(true)}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12,
                background: C.rust, border: 'none',
                color: '#fff', fontSize: 'var(--fs-14)', fontWeight: 700,
                cursor: 'pointer', letterSpacing: '0.04em',
              }}
            >
              + PLAN THE DAY
            </button>
          </div>
        )}
      </Glass>

      {sheet && (
        <PlanDaySheet
          existing={plan}
          dark={dark}
          onClose={() => setSheet(false)}
          onSave={async fields => { await upsertPlan(fields); setSheet(false) }}
          onClear={plan ? async () => { await clearPlan(); setSheet(false) } : undefined}
        />
      )}
    </>
  )
}
