import { useState } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { use50Hikes } from '../../../hooks/use50Hikes'
import { HikeLogSheet } from './HikeLogSheet'
import type { Hike } from '../../../hooks/use50Hikes'

interface Props { dark?: boolean }

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null
  return (
    <span style={{ color: C.rust, fontSize: 10, letterSpacing: 1 }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

function formatMonths(months: string[] | null): string {
  if (!months || months.length === 0) return ''
  if (months.length <= 3) return months.join('–')
  return `${months[0]}–${months[months.length - 1]}`
}

export function W50Hikes({ dark }: Props) {
  const { hikes, doneCount, suggested, isLoading, refetch } = use50Hikes()
  const [expanded, setExpanded] = useState(false)
  const [logging, setLogging] = useState<Hike | null>(null)

  const pct = (doneCount / 50) * 100

  if (isLoading) {
    return (
      <Glass dark={dark} span={12} pad={16}>
        <CardLabel dark={dark}>50 Hikes with Kids · Colorado</CardLabel>
        <div className="mono" style={{ fontSize: 'var(--fs-12)', opacity: 0.4, marginTop: 8 }}>Loading…</div>
      </Glass>
    )
  }

  return (
    <>
      <Glass dark={dark} span={12} pad={16}>
        {/* Header row */}
        <div
          onClick={() => setExpanded(e => !e)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: 10 }}
        >
          <CardLabel dark={dark}>· 50 Hikes with Kids · Colorado</CardLabel>
          <div className="mono" style={{ fontSize: 'var(--fs-13)', opacity: 0.7 }}>
            {doneCount} / 50 {expanded ? '▲' : '▽'}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 4, borderRadius: 2, background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(26,18,8,0.1)',
          marginBottom: expanded ? 16 : 14, overflow: 'hidden',
        }}>
          <div style={{ height: '100%', width: `${pct}%`, background: C.rust, borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>

        {/* Collapsed: suggested hike */}
        {!expanded && suggested && (
          <div style={{
            borderLeft: `2px solid ${C.rust}`, paddingLeft: 12,
            background: dark ? 'rgba(196,82,42,0.08)' : 'rgba(196,82,42,0.06)',
            borderRadius: '0 10px 10px 0', padding: '10px 12px',
          }}>
            <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.5, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Suggested Today
            </div>
            <div className="badge" style={{ fontSize: 'var(--fs-14)', marginBottom: 4 }}>
              {suggested.name}
            </div>
            {suggested.highlights && (
              <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.7, marginBottom: 4 }}>
                {suggested.highlights}
              </div>
            )}
            <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.55, marginBottom: 10 }}>
              {[
                suggested.distance_mi ? `${suggested.distance_mi}mi` : null,
                suggested.elevation_gain_ft ? `${suggested.elevation_gain_ft}ft` : null,
                suggested.drive_minutes_denver ? `${suggested.drive_minutes_denver} min` : null,
                suggested.hub,
                suggested.best_months ? `Best: ${formatMonths(suggested.best_months)}` : null,
              ].filter(Boolean).join(' · ')}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {suggested.alltrails_url && (
                <a
                  href={suggested.alltrails_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="mono"
                  style={{ fontSize: 'var(--fs-11)', color: C.sand, textDecoration: 'none', padding: '5px 10px', border: `1px solid ${C.sand}`, borderRadius: 8 }}
                >
                  AllTrails ↗
                </a>
              )}
              <button
                onClick={e => { e.stopPropagation(); setLogging(suggested) }}
                className="mono"
                style={{
                  fontSize: 'var(--fs-11)', background: C.rust, color: '#fff',
                  border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
                }}
              >
                Done ✓
              </button>
            </div>
          </div>
        )}

        {!expanded && !suggested && doneCount === 50 && (
          <div className="badge" style={{ fontSize: 'var(--fs-14)', color: C.rust, textAlign: 'center', padding: '12px 0' }}>
            All 50 hikes complete! 🏔️
          </div>
        )}

        {/* Expanded: full list */}
        {expanded && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {hikes.map(hike => (
              <div
                key={hike.id}
                onClick={() => setLogging(hike)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 0',
                  borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(26,18,8,0.07)'}`,
                  cursor: 'pointer',
                  borderLeft: suggested?.id === hike.id ? `2px solid ${C.rust}` : '2px solid transparent',
                  paddingLeft: 8,
                }}
              >
                {/* Check */}
                <div style={{
                  width: 16, flexShrink: 0, marginTop: 2,
                  color: hike.done ? C.rust : dark ? 'rgba(255,255,255,0.2)' : 'rgba(26,18,8,0.2)',
                  fontSize: 'var(--fs-13)',
                }}>
                  {hike.done ? '✓' : '○'}
                </div>

                {/* Number */}
                <div className="mono" style={{ width: 22, flexShrink: 0, fontSize: 'var(--fs-11)', opacity: 0.4, marginTop: 3 }}>
                  {hike.book_number}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      className="badge"
                      style={{ fontSize: 'var(--fs-13)', opacity: hike.done ? 0.45 : 1 }}
                    >
                      {hike.name}
                    </span>
                    {hike.done && <Stars rating={hike.family_rating} />}
                    {suggested?.id === hike.id && (
                      <span className="mono" style={{ fontSize: 9, color: C.rust, opacity: 0.7, letterSpacing: '0.06em' }}>← today</span>
                    )}
                  </div>
                  {hike.highlights && (
                    <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.6, marginTop: 2 }}>
                      {hike.highlights}
                    </div>
                  )}
                </div>

                {/* AllTrails link */}
                {hike.alltrails_url && (
                  <a
                    href={hike.alltrails_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="mono"
                    style={{ fontSize: 'var(--fs-11)', color: C.sand, flexShrink: 0, marginTop: 3, textDecoration: 'none' }}
                  >
                    ↗
                  </a>
                )}
              </div>
            ))}

            <button
              onClick={() => setLogging(suggested ?? hikes.find(h => !h.done) ?? null)}
              className="badge"
              style={{
                width: '100%', marginTop: 14, padding: '10px 0',
                background: 'transparent',
                border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(26,18,8,0.2)'}`,
                borderRadius: 10, color: dark ? C.cream : C.dark,
                fontSize: 'var(--fs-12)', cursor: 'pointer', letterSpacing: '0.06em',
              }}
            >
              + LOG A COMPLETION
            </button>
          </div>
        )}
      </Glass>

      {logging && (
        <HikeLogSheet
          hike={logging}
          dark={dark}
          onClose={() => setLogging(null)}
          onSaved={refetch}
        />
      )}
    </>
  )
}
