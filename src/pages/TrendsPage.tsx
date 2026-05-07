import { Header } from '../components/ui/Header'
import { Ring } from '../components/ui/Ring'
import { CardLabel } from '../components/ui/CardLabel'
import { C } from '../tokens'

const ROWS = [
  { l: 'Weight',     v: '183.2 lbs', d: '↓ 1.8/mo',   ok: true,  hero: false },
  { l: 'Body fat %', v: '22.8 %',    d: '↓ 0.4/mo',   ok: true,  hero: false },
  { l: 'Miles run',  v: '18.2 /wk',  d: '↑ from 14',  ok: true,  hero: false },
  { l: 'Workouts',   v: '5 /wk',     d: '→ same',      ok: null,  hero: false },
  { l: 'RHR',        v: '61 bpm',    d: '↓ from 63',  ok: true,  hero: false },
  { l: 'Drinks/day', v: '1.4',       d: '↓ from 2.8', ok: true,  hero: false },
  { l: 'MIT %',      v: '73 %',      d: '↑ +12',       ok: true,  hero: true  },
]

export function TrendsPage() {
  return (
    <div style={{ position: 'relative', zIndex: 10 }}>
      <Header greeting="Trends · report card" sub="ROLLING 28 vs 90 · TAP A ROW" dark={false} />
      <div style={{ padding: '0 16px 100px' }}>
        <div style={{
          background: '#fff', borderRadius: 18,
          border: `0.5px solid ${C.ink20}`, overflow: 'hidden',
        }}>
          {ROWS.map((r, i) => (
            <div key={i} style={{
              padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: i < ROWS.length - 1 ? `0.5px dashed rgba(26,18,8,0.15)` : 'none',
              background: r.hero ? 'rgba(196,82,42,0.06)' : 'transparent',
              cursor: 'pointer',
            }}>
              <div>
                <div className="badge" style={{ fontSize: 11, color: r.hero ? C.rust : C.dark }}>
                  {r.l}{r.hero && ' · meta'}
                </div>
                <div className="mono" style={{ fontSize: 10, color: r.ok ? C.tealDk : C.ink60, marginTop: 2 }}>
                  {r.d}
                </div>
              </div>
              <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: r.hero ? C.rust : C.dark }}>
                {r.v}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 14, padding: 14, borderRadius: 16,
          background: '#fff', border: `0.5px solid ${C.ink20}`,
        }}>
          <CardLabel>West line winder · readiness</CardLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
            <Ring pct={64} color={C.rust} label="64" size={64} sw={6} />
            <div>
              <div className="badge" style={{ fontSize: 13 }}>ON TRACK · BUILD BLOCK</div>
              <div className="mono" style={{ fontSize: 10, color: C.ink60, marginTop: 2 }}>
                need: 12mi long run by 6/15 · howard 3x
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
