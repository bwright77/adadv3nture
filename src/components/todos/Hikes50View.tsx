import { useState } from 'react'
import { C } from '../../tokens'
import { use50Hikes, type Hike } from '../../hooks/use50Hikes'
import { HikeLogSheet } from '../dashboard/widgets/HikeLogSheet'
import { Ring } from '../ui/Ring'

type Difficulty = NonNullable<Hike['difficulty']>
const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'moderate', 'challenging']
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  challenging: 'Challenging',
}

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
  const { hikes, doneCount, suggested, isLoading, refetch } = use50Hikes()
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

  // Difficulty buckets — segments by tier, widths proportional to total,
  // opacity proportional to in-bucket completion.
  const totalRated = hikes.filter(h => h.difficulty).length || 50
  const buckets = DIFFICULTY_ORDER.map(diff => {
    const bucket = hikes.filter(h => h.difficulty === diff)
    const total = bucket.length
    const done = bucket.filter(h => h.done).length
    return { diff, total, done, ratio: total > 0 ? done / total : 0 }
  })

  // Average family rating across completed hikes
  const rated = hikes.filter(h => h.done && h.family_rating)
  const avgRating = rated.length > 0
    ? rated.reduce((s, h) => s + (h.family_rating ?? 0), 0) / rated.length
    : null
  const totalMiles = hikes
    .filter(h => h.done && h.distance_mi)
    .reduce((s, h) => s + (h.distance_mi ?? 0), 0)

  return (
    <div style={{ marginTop: 24 }}>
      {/* Hero — teal gradient mirrors the Anchor card on Trends.
          Tap opens the suggested-next hike's log sheet, or the first
          unfinished hike if no seasonal suggestion is available. */}
      <button
        type="button"
        onClick={() => {
          const target = suggested ?? hikes.find(h => !h.done)
          if (target) setLogging(target)
        }}
        disabled={doneCount === 50}
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          marginBottom: 14, padding: 18, borderRadius: 18,
          background: `linear-gradient(135deg, ${C.teal} 0%, ${C.tealDk} 100%)`,
          color: C.cream, position: 'relative', overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(91,188,184,0.3)',
          border: 'none', fontFamily: 'inherit',
          cursor: doneCount === 50 ? 'default' : 'pointer',
        }}
      >
        {/* Mountain silhouette — same shape as the Anchor card */}
        <svg viewBox="0 0 300 60" preserveAspectRatio="none" style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          width: '100%', height: 60, opacity: 0.22,
        }}>
          <path d="M0 60 L0 35 L40 18 L70 28 L110 8 L150 22 L190 12 L230 26 L270 14 L300 22 L300 60 Z" fill={C.cream} />
        </svg>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Ring pct={pct} color={C.cream} label={String(doneCount)} size={72} sw={6} />
          <div style={{ flex: 1 }}>
            <div className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.18em', opacity: 0.85 }}>
              50 HIKES · {50 - doneCount} TO GO
            </div>
            <div className="badge" style={{ fontSize: 'var(--fs-22)', lineHeight: 1, marginTop: 4, letterSpacing: '0.02em' }}>
              50 HIKES WITH KIDS
            </div>
            <div className="badge" style={{ fontSize: 'var(--fs-13)', opacity: 0.85, marginTop: 1 }}>
              COLORADO · {doneCount}/50 DONE
            </div>
            {(avgRating != null || totalMiles > 0) && (
              <div className="mono" style={{ fontSize: 'var(--fs-11)', marginTop: 6, opacity: 0.85, lineHeight: 1.4 }}>
                {avgRating != null ? `family rating: ${avgRating.toFixed(1)}★` : ''}
                {avgRating != null && totalMiles > 0 ? ' · ' : ''}
                {totalMiles > 0 ? `${totalMiles.toFixed(1)}mi logged` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Difficulty progression bar */}
        <div style={{ position: 'relative', marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            {buckets.map(b => (
              <div key={b.diff} className="mono" style={{
                fontSize: 'var(--fs-10)',
                opacity: b.done > 0 ? 1 : 0.45,
                color: C.cream,
              }}>
                {DIFFICULTY_LABEL[b.diff]}
              </div>
            ))}
          </div>
          <div style={{
            height: 4, borderRadius: 2,
            background: 'rgba(245,237,214,0.2)',
            display: 'flex', overflow: 'hidden',
          }}>
            {buckets.map(b => (
              <div key={b.diff} style={{
                height: '100%',
                width: `${(b.total / totalRated) * 100}%`,
                background: b.done > 0
                  ? `rgba(245,237,214,${0.4 + b.ratio * 0.5})`
                  : 'rgba(245,237,214,0.25)',
              }} />
            ))}
          </div>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', marginTop: 4, opacity: 0.55 }}>
            {buckets.map(b => `${DIFFICULTY_LABEL[b.diff]} ${b.done}/${b.total}`).join(' · ')}
          </div>
        </div>

        {suggested && doneCount < 50 && (
          <div className="mono" style={{
            position: 'relative', marginTop: 12,
            fontSize: 'var(--fs-11)', opacity: 0.85, lineHeight: 1.4,
          }}>
            next: <span className="badge" style={{ fontSize: 'var(--fs-12)' }}>{suggested.name}</span>
          </div>
        )}
      </button>

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
