import { useState } from 'react'
import { C } from '../../tokens'
import { use50Hikes, type Hike } from '../../hooks/use50Hikes'
import { HikeLogSheet } from '../dashboard/widgets/HikeLogSheet'

type Filter = 'all' | 'todo' | 'done'

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

function HikeRow({ hike, expanded, onToggle, onLog }: {
  hike: Hike
  expanded: boolean
  onToggle: () => void
  onLog: () => void
}) {
  const meta = [
    hike.hub,
    hike.distance_mi ? `${hike.distance_mi}mi` : null,
    hike.drive_minutes_denver ? `${hike.drive_minutes_denver}min drive` : null,
    hike.difficulty,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{
      borderBottom: `0.5px solid ${C.ink20}`,
      background: expanded ? 'rgba(196,82,42,0.04)' : 'transparent',
      transition: 'background 0.15s',
    }}>
      {/* Compact row — tap to expand */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          width: '100%', textAlign: 'left',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '10px 12px', fontFamily: 'inherit',
        }}
      >
        <span style={{
          width: 16, flexShrink: 0, marginTop: 2,
          color: hike.done ? C.rust : C.ink40,
          fontSize: 'var(--fs-14)',
        }}>
          {hike.done ? '✓' : '○'}
        </span>
        <span className="mono" style={{
          width: 22, flexShrink: 0, fontSize: 'var(--fs-11)', opacity: 0.4, marginTop: 3,
        }}>
          {hike.book_number}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="badge" style={{
              fontSize: 'var(--fs-14)', color: C.dark,
              opacity: hike.done ? 0.55 : 1,
            }}>
              {hike.name}
            </span>
            {hike.done && <Stars rating={hike.family_rating} />}
          </span>
          {meta && (
            <span className="mono" style={{
              display: 'block', fontSize: 'var(--fs-11)',
              color: C.ink60, marginTop: 2,
            }}>
              {meta}
            </span>
          )}
        </span>
        <span style={{ color: C.ink40, fontSize: 'var(--fs-13)', marginTop: 3 }}>
          {expanded ? '▴' : '▾'}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 14px 14px 60px' }}>
          {hike.highlights && (
            <div style={{ fontSize: 'var(--fs-13)', color: C.dark, lineHeight: 1.4, marginBottom: 8 }}>
              {hike.highlights}
            </div>
          )}
          <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink60, marginBottom: 10 }}>
            {[
              hike.region,
              hike.elevation_gain_ft ? `${hike.elevation_gain_ft.toLocaleString()}ft gain` : null,
              hike.best_months ? `Best: ${formatMonths(hike.best_months)}` : null,
            ].filter(Boolean).join(' · ')}
          </div>
          {hike.done && hike.date_done && (
            <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.ink60, marginBottom: 8 }}>
              Done {hike.date_done}{hike.notes ? ` · ${hike.notes}` : ''}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {hike.alltrails_url && (
              <a
                href={hike.alltrails_url}
                target="_blank"
                rel="noreferrer"
                className="mono"
                style={{
                  fontSize: 'var(--fs-12)', color: C.sand,
                  padding: '6px 12px', border: `1px solid ${C.sand}`,
                  borderRadius: 8, textDecoration: 'none',
                }}
              >
                AllTrails ↗
              </a>
            )}
            <button
              onClick={onLog}
              className="mono"
              style={{
                fontSize: 'var(--fs-12)', background: C.rust, color: '#fff',
                border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                fontWeight: 700, letterSpacing: '0.04em',
              }}
            >
              {hike.done ? 'Edit log' : 'Mark done ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Hikes50View() {
  const { hikes, doneCount, isLoading, refetch } = use50Hikes()
  const [filter, setFilter] = useState<Filter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [logging, setLogging] = useState<Hike | null>(null)

  if (isLoading) {
    return (
      <div style={{ padding: 24, color: C.ink40, fontSize: 'var(--fs-13)', textAlign: 'center' }}>
        Loading hikes…
      </div>
    )
  }

  const filtered = hikes.filter(h => {
    if (filter === 'done') return h.done
    if (filter === 'todo') return !h.done
    return true
  })
  const pct = (doneCount / 50) * 100

  return (
    <div style={{ marginTop: 24 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="mono" style={{
          fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.15em',
          color: C.ink40,
        }}>
          ◆ 50 HIKES WITH KIDS · COLORADO
        </div>
        <div className="mono" style={{ fontSize: 'var(--fs-12)', color: C.ink60 }}>
          {doneCount} / 50
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, borderRadius: 2, background: 'rgba(26,18,8,0.08)',
        overflow: 'hidden', marginBottom: 12,
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: C.rust,
          borderRadius: 2, transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['all', 'todo', 'done'] as Filter[]).map(f => {
          const selected = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 12px', borderRadius: 999,
                background: selected ? C.dark : 'transparent',
                color: selected ? C.cream : C.ink60,
                border: `1px solid ${selected ? C.dark : C.ink20}`,
                fontSize: 'var(--fs-12)', fontFamily: 'inherit',
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              {f === 'all' ? 'All 50' : f === 'todo' ? 'Todo' : 'Done'}
            </button>
          )
        })}
      </div>

      {/* List */}
      <div style={{
        background: '#fff', border: `0.5px solid ${C.ink20}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: C.ink40, fontSize: 'var(--fs-13)' }}>
            {filter === 'done' ? 'No hikes done yet.' : 'All hikes done!'}
          </div>
        ) : filtered.map(hike => (
          <HikeRow
            key={hike.id}
            hike={hike}
            expanded={expandedId === hike.id}
            onToggle={() => setExpandedId(id => id === hike.id ? null : hike.id)}
            onLog={() => setLogging(hike)}
          />
        ))}
      </div>

      {logging && (
        <HikeLogSheet
          hike={logging}
          onClose={() => setLogging(null)}
          onSaved={refetch}
        />
      )}
    </div>
  )
}
