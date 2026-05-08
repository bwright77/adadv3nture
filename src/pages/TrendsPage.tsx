import { useState, useEffect } from 'react'
import { Header } from '../components/ui/Header'
import { Ring } from '../components/ui/Ring'
import { CardLabel } from '../components/ui/CardLabel'
import { C } from '../tokens'
import { useAuth } from '../contexts/AuthContext'
import { getTrends, type TrendData } from '../lib/trends'

function DirectionChip({ direction, isGood }: { direction: 'up' | 'down' | 'flat' | null; isGood: boolean | null }) {
  if (direction == null || isGood == null) return null
  const color = isGood ? C.teal : C.rust
  const neutral = direction === 'flat'
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
      background: neutral ? 'rgba(26,18,8,0.12)' : `${color}22`,
      color: neutral ? 'rgba(26,18,8,0.4)' : color,
      fontSize: 9, fontWeight: 700, lineHeight: '16px', textAlign: 'center',
      flexShrink: 0,
    }}>
      {neutral ? '→' : isGood ? '✓' : '↑'}
    </span>
  )
}

export function TrendsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<TrendData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getTrends(user.id)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [user])

  const rows = data?.rows ?? []
  const r = data?.readiness

  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <Header greeting="Trends · report card" sub="THIS WEEK vs LAST · TAP TO EXPAND" dark={false} />
      <div style={{ padding: '0 16px 100px' }}>

        {/* Report card */}
        <div style={{
          background: '#fff', borderRadius: 18,
          border: `0.5px solid ${C.ink20}`, overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: 20, fontSize: 12, opacity: 0.4 }}>Loading trends…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 20, fontSize: 12, opacity: 0.4 }}>No data yet.</div>
          ) : rows.map((row, i) => (
            <div key={i} style={{
              padding: '13px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: i < rows.length - 1 ? `0.5px dashed rgba(26,18,8,0.12)` : 'none',
              background: row.isHero ? 'rgba(196,82,42,0.05)' : 'transparent',
              opacity: row.noData ? 0.45 : 1,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="badge" style={{
                  fontSize: 11,
                  color: row.isHero ? C.rust : C.dark,
                }}>
                  {row.label}{row.isHero ? ' · meta' : ''}
                </div>
                <div className="mono" style={{
                  fontSize: 9.5, marginTop: 2,
                  color: row.isGood === true ? C.tealDk : row.isGood === false ? C.rust : C.ink40,
                }}>
                  {row.delta}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="mono" style={{
                  fontSize: 17, fontWeight: 700,
                  color: row.isHero ? C.rust : C.dark,
                }}>
                  {row.value}
                </div>
                <DirectionChip direction={row.direction} isGood={row.isGood} />
              </div>
            </div>
          ))}
        </div>

        {/* West Line Winder readiness */}
        <div style={{
          marginTop: 12, padding: 16, borderRadius: 18,
          background: '#fff', border: `0.5px solid ${C.ink20}`,
        }}>
          <CardLabel>West Line Winder 30K · Sept 26 2026</CardLabel>
          {loading ? (
            <div style={{ fontSize: 11, opacity: 0.4, marginTop: 8 }}>Loading…</div>
          ) : r ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
                <Ring pct={r.pct} color={C.rust} label={String(r.pct)} size={68} sw={6} />
                <div style={{ flex: 1 }}>
                  <div className="badge" style={{ fontSize: 13 }}>{r.label}</div>
                  <div className="mono" style={{ fontSize: 9.5, color: C.ink60, marginTop: 3 }}>
                    {r.daysUntil} days out · {Math.floor(r.daysUntil / 7)} weeks
                  </div>
                  {r.longestRunMiles != null && (
                    <div className="mono" style={{ fontSize: 9.5, color: C.ink60, marginTop: 1 }}>
                      longest run: {r.longestRunMiles.toFixed(1)} mi
                      {r.weeklyMilesAvg != null && ` · avg ${r.weeklyMilesAvg.toFixed(1)} mi/wk`}
                    </div>
                  )}
                  <div className="mono" style={{ fontSize: 9.5, color: C.rust, marginTop: 3 }}>
                    ↳ {r.nextMilestone}
                  </div>
                </div>
              </div>

              {/* Phase progress bar */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  {['Run base', 'Cycling', 'Trail focus', 'Race'].map((phase, i) => (
                    <div key={i} className="mono" style={{
                      fontSize: 8, opacity: i === 0 ? 1 : 0.4,
                      color: i === 0 ? C.rust : C.dark,
                    }}>
                      {phase}
                    </div>
                  ))}
                </div>
                <div style={{
                  height: 4, borderRadius: 2,
                  background: 'rgba(26,18,8,0.08)',
                  display: 'flex', overflow: 'hidden',
                }}>
                  {[
                    { label: 'Run base', days: 54, color: C.rust },
                    { label: 'Cycling', days: 45, color: C.teal },
                    { label: 'Trail', days: 36, color: C.sand },
                    { label: 'Taper', days: 6, color: C.sandLt },
                  ].map((phase, i) => {
                    const total = 54 + 45 + 36 + 6
                    const isActive = i === 0
                    return (
                      <div key={i} style={{
                        height: '100%',
                        width: `${(phase.days / total) * 100}%`,
                        background: isActive ? phase.color : `${phase.color}44`,
                      }} />
                    )
                  })}
                </div>
                <div className="mono" style={{ fontSize: 8, marginTop: 3, opacity: 0.5 }}>
                  May 8 → Jul 1 (run base) · Jul 1 → Aug 15 (cycling) · Aug 15 → Sep 20 (trail) · taper
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Baseline context */}
        <div style={{
          marginTop: 12, padding: 14, borderRadius: 16,
          background: '#fff', border: `0.5px solid ${C.ink20}`,
        }}>
          <CardLabel>Baselines</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginTop: 8 }}>
            {[
              ['FTP', '269W'],
              ['MHR', '191 bpm (sea lvl)'],
              ['RHR baseline', '63 bpm'],
              ['HRR', '128 bpm'],
              ['Z2 ceiling', '152 bpm (Denver)'],
              ['Z4 threshold', '165–178 bpm'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, opacity: 0.55 }}>{label}</span>
                <span className="mono" style={{ fontSize: 10, fontWeight: 700 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
