import { useState, useEffect } from 'react'
import { Ring } from '../components/ui/Ring'
import { C } from '../tokens'
import { useAuth } from '../contexts/AuthContext'
import { getTrends, type TrendData } from '../lib/trends'
import { useLocation } from '../hooks/useLocation'

function weekNum(): string {
  const d = new Date()
  const onejan = new Date(d.getFullYear(), 0, 1)
  const wk = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7)
  return `VOL.II · WK ${wk}`
}

const DIRECTION_LABEL: Record<string, string> = { up: '↑', down: '↓', flat: '→' }

interface TrendsPageProps { bgPhoto?: string }

export function TrendsPage({ bgPhoto }: TrendsPageProps) {
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
  const { location } = useLocation()
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase() + ' · ' + location.name.toUpperCase()

  return (
    <div style={{ position: 'relative', zIndex: 10, background: C.paper }}>

      {/* Masthead — dark top, newspaper-editorial feel */}
      <div style={{
        ...(bgPhoto ? { background: `url(${bgPhoto}) center/cover no-repeat` } : { background: C.dark }),
        padding: 'calc(env(safe-area-inset-top, 0px) + 56px) 18px 0', position: 'relative', overflow: 'hidden', minHeight: bgPhoto ? 220 : 'auto',
      }}>
        {bgPhoto && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(26,18,8,0.72) 0%, rgba(26,18,8,0.55) 45%, rgba(26,18,8,0.90) 78%, #FBF7EC 100%)',
          }} />
        )}
        {!bgPhoto && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.10 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>")`,
            opacity: 0.7, mixBlendMode: 'multiply',
          }} />
        )}
        <div style={{ position: 'relative', zIndex: 1, color: C.cream }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.25em', opacity: 0.85 }}>◆ THE FIELD LEDGER</span>
            <span className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.2em', opacity: 0.7 }}>{weekNum()}</span>
          </div>
          <div className="badge" style={{ fontSize: 'var(--fs-56)', lineHeight: 0.88, letterSpacing: '0.005em', marginTop: 8 }}>
            REPORT<br />CARD.
          </div>
          <div className="mono" style={{ fontSize: 'var(--fs-11)', opacity: 0.75, marginTop: 6, letterSpacing: '0.1em', paddingBottom: 24 }}>
            ROLLING 28 vs PRIOR 28 · {dateStr}
          </div>
        </div>
      </div>

      {/* Content section */}
      <div style={{ padding: '0 14px 100px' }}>

        {/* Hero metric card — race readiness */}
        <div style={{
          marginTop: -18,
          padding: 18,
          background: C.dark, color: C.cream, borderRadius: 18,
          position: 'relative',
          boxShadow: '0 14px 40px rgba(26,18,8,0.5)',
          border: '1px solid rgba(245,237,214,0.1)',
        }}>
          <div style={{ position: 'absolute', top: 12, right: 14, background: C.rust, color: C.cream, padding: '3px 8px', borderRadius: 999, fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.18em' }} className="mono">★ ANCHOR</div>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.7, letterSpacing: '0.2em' }}>
            WEST LINE WINDER READINESS
          </div>
          {loading ? (
            <div style={{ fontSize: 'var(--fs-14)', opacity: 0.4, marginTop: 12 }}>Loading…</div>
          ) : r ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span className="badge" style={{ fontSize: 'var(--fs-56)', lineHeight: 0.85, color: C.cream, letterSpacing: '-0.02em' }}>{r.pct}</span>
                <span className="badge" style={{ fontSize: 'var(--fs-24)', color: C.sand }}>%</span>
                <span style={{ flex: 1 }} />
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 'var(--fs-12)', color: C.teal, fontWeight: 700 }}>{r.label}</div>
                  <div className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.6, marginTop: 2 }}>{r.daysUntil}d · {Math.floor(r.daysUntil / 7)}wk out</div>
                </div>
              </div>
              {/* Phase progress bars (8 weeks shown) */}
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28, marginTop: 14 }}>
                {[0.30, 0.36, 0.42, 0.50, 0.55, 0.62, 0.68, r.pct / 100].map((p, i) => (
                  <div key={i} style={{
                    flex: 1, height: `${p * 100}%`,
                    background: i === 7 ? C.rust : 'rgba(245,237,214,0.22)',
                    borderRadius: 2,
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.5 }}>8 WK AGO</span>
                <span className="mono" style={{ fontSize: 'var(--fs-10)', opacity: 0.5 }}>NOW</span>
              </div>
              <div className="mono" style={{ fontSize: 'var(--fs-11)', color: C.teal, marginTop: 8, opacity: 0.9 }}>
                ↳ {r.nextMilestone}
              </div>
            </>
          ) : null}
        </div>

        {/* Report card table */}
        <div style={{
          marginTop: 14, padding: '4px 16px',
          background: '#fff', borderRadius: 18,
          border: `0.5px solid ${C.ink20}`,
          boxShadow: '0 6px 20px rgba(26,18,8,0.06)',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '10px 0 8px',
            borderBottom: `1.5px solid ${C.dark}`,
          }}>
            <span className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.2em' }}>METRIC</span>
            <span className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.2em' }}>ΔTREND</span>
            <span className="mono" style={{ fontSize: 'var(--fs-10)', fontWeight: 700, letterSpacing: '0.2em' }}>NOW</span>
          </div>

          {loading ? (
            <div style={{ padding: '20px 0', fontSize: 'var(--fs-14)', opacity: 0.4 }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '20px 0', fontSize: 'var(--fs-14)', opacity: 0.4 }}>No data yet.</div>
          ) : rows.map((row, i) => {
            const dirColor = row.isGood === true ? C.tealDk : row.isGood === false ? C.rust : C.ink60
            const dirIcon = row.direction ? DIRECTION_LABEL[row.direction] : '·'
            return (
              <div key={i} style={{
                padding: '11px 0', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < rows.length - 1 ? `0.5px dashed rgba(26,18,8,0.2)` : 'none',
                opacity: row.noData ? 0.45 : 1,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="badge" style={{
                    fontSize: 'var(--fs-13)', color: C.dark, letterSpacing: '0.04em',
                  }}>
                    {row.label.toUpperCase()}
                  </div>
                  <div className="mono" style={{ fontSize: 'var(--fs-11)', color: dirColor, marginTop: 1 }}>
                    {row.delta}
                  </div>
                </div>
                <div style={{ color: dirColor, fontSize: 'var(--fs-15)', fontWeight: 700, width: 18, textAlign: 'center', flexShrink: 0 }}>
                  {dirIcon}
                </div>
                <div style={{ minWidth: 72, textAlign: 'right' }}>
                  <span className="badge" style={{ fontSize: 'var(--fs-22)', color: C.dark, letterSpacing: '-0.01em' }}>
                    {row.value.split(' ')[0]}
                  </span>
                  <span className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60, marginLeft: 3 }}>
                    {row.value.split(' ').slice(1).join(' ')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Anchor event — rust gradient with mountain silhouette */}
        {r && (
          <div style={{
            marginTop: 14, padding: 18, borderRadius: 18,
            background: `linear-gradient(135deg, ${C.rust} 0%, ${C.rustDk} 100%)`,
            color: C.cream, position: 'relative', overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(196,82,42,0.3)',
          }}>
            {/* Mountain silhouette */}
            <svg viewBox="0 0 300 60" preserveAspectRatio="none" style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: 60, opacity: 0.22,
            }}>
              <path d="M0 60 L0 35 L40 18 L70 28 L110 8 L150 22 L190 12 L230 26 L270 14 L300 22 L300 60 Z" fill={C.cream} />
            </svg>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Ring pct={r.pct} color={C.cream} label={String(r.pct)} size={72} sw={6} />
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.18em', opacity: 0.85 }}>
                  ANCHOR EVENT · {r.daysUntil} DAYS
                </div>
                <div className="badge" style={{ fontSize: 'var(--fs-22)', lineHeight: 1, marginTop: 4, letterSpacing: '0.02em' }}>
                  WEST LINE WINDER
                </div>
                <div className="badge" style={{ fontSize: 'var(--fs-13)', opacity: 0.85, marginTop: 1 }}>
                  30K · BUENA VISTA · 9·26
                </div>
                {r.longestRunMiles != null && (
                  <div className="mono" style={{ fontSize: 'var(--fs-11)', marginTop: 6, opacity: 0.85, lineHeight: 1.4 }}>
                    longest run: {r.longestRunMiles.toFixed(1)}mi
                    {r.weeklyMilesAvg != null ? ` · avg ${r.weeklyMilesAvg.toFixed(1)} mi/wk` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Training phase bar */}
            <div style={{ position: 'relative', marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                {['Run base', 'Cycling', 'Trail', 'Race'].map((phase, i) => (
                  <div key={i} className="mono" style={{
                    fontSize: 'var(--fs-10)',
                    opacity: i === 0 ? 1 : 0.45,
                    color: C.cream,
                  }}>
                    {phase}
                  </div>
                ))}
              </div>
              <div style={{
                height: 4, borderRadius: 2,
                background: 'rgba(245,237,214,0.2)',
                display: 'flex', overflow: 'hidden',
              }}>
                {[{ days: 54, active: true }, { days: 45, active: false }, { days: 36, active: false }, { days: 6, active: false }].map((ph, i) => (
                  <div key={i} style={{
                    height: '100%',
                    width: `${(ph.days / 141) * 100}%`,
                    background: ph.active ? 'rgba(245,237,214,0.9)' : 'rgba(245,237,214,0.25)',
                  }} />
                ))}
              </div>
              <div className="mono" style={{ fontSize: 'var(--fs-10)', marginTop: 4, opacity: 0.55 }}>
                May 8→Jul 1 (run) · Jul 1→Aug 15 (cycle) · Aug 15→Sep 20 (trail)
              </div>
            </div>
          </div>
        )}

        {/* Baselines — compact */}
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 16,
          background: '#fff', border: `0.5px solid ${C.ink20}`,
        }}>
          <div className="badge" style={{ fontSize: 'var(--fs-10)', letterSpacing: '0.18em', color: C.ink60, marginBottom: 8 }}>
            BASELINES · DENVER 5,318FT
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            {[
              ['FTP', '269W'],
              ['MHR', '191 bpm (sea lvl)'],
              ['RHR baseline', '63 bpm'],
              ['HRR', '128 bpm'],
              ['Z2 ceiling', '152 bpm (Denver)'],
              ['Z4 threshold', '165–178 bpm'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '3px 0' }}>
                <span style={{ fontSize: 'var(--fs-12)', color: C.ink60 }}>{label}</span>
                <span className="mono" style={{ fontSize: 'var(--fs-12)', fontWeight: 700, color: C.dark }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
