import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { loadRecovery, type RecoveryResult } from '../../../lib/recovery'
import { getProgram, type ProgramState } from '../../../lib/program-tracker'
import { supabase } from '../../../lib/supabase'
import { useAnchorEvent } from '../../../hooks/useAnchorEvent'
import { daysUntil, formatCountdownChip } from '../../../lib/countdown'
import { useLocation } from '../../../hooks/useLocation'

interface WMorningHeroProps {
  dark?: boolean
  briefingText: string | null
  briefingLoading: boolean
}

const TIER_COLOR: Record<string, string> = {
  go_hard:  '#2A6F6C',
  moderate: '#D4824A',
  recovery: '#C4522A',
  unknown:  'rgba(26,18,8,0.35)',
}
const TIER_LABEL: Record<string, string> = {
  go_hard: 'GO HARD',
  moderate: 'MODERATE',
  recovery: 'RECOVERY',
  unknown: 'NO DATA',
}

function RecoveryGauge({ score, tier, size = 104 }: { score: number; tier: string; size?: number }) {
  const r = size / 2 - 8
  const circ = 2 * Math.PI * r
  const offset = circ - circ * (score / 100)
  const color = TIER_COLOR[tier] ?? TIER_COLOR.unknown
  return (
    <div style={{ width: size, height: size + 20, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(26,18,8,0.12)" strokeWidth="6" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="6" fill="none"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: size, height: size,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="badge" style={{ fontSize: 'var(--fs-26)', lineHeight: 1, color: C.dark }}>{score}</div>
        <div className="mono" style={{ fontSize: 'var(--fs-10)', color: C.ink60 }}>RECOVERY</div>
      </div>
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        background: color, color: C.cream, padding: '2px 8px', borderRadius: 4,
        fontFamily: '"JetBrains Mono", monospace', fontSize: 'var(--fs-10)', fontWeight: 700,
        letterSpacing: '0.1em', whiteSpace: 'nowrap',
      }}>{TIER_LABEL[tier]}</div>
    </div>
  )
}

function MiniTile({ label, value, sub, accent, tileDark = false }: {
  label: string; value: string; sub: string; accent?: string; tileDark?: boolean
}) {
  return (
    <div style={{
      flex: 1, padding: '8px 10px', borderRadius: 14,
      background: tileDark ? 'rgba(26,18,8,0.9)' : 'rgba(251,247,236,0.9)',
      border: tileDark ? 'none' : '1px solid rgba(26,18,8,0.12)',
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <div className="mono" style={{ fontSize: 'var(--fs-10)', color: tileDark ? 'rgba(245,237,214,0.6)' : C.ink60 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="badge" style={{ fontSize: 'var(--fs-22)', lineHeight: 1, color: tileDark ? C.cream : C.dark }}>{value}</span>
        <span className="mono" style={{ fontSize: 'var(--fs-10)', color: accent ?? C.rust }}>{sub}</span>
      </div>
    </div>
  )
}

function Dotted() {
  return (
    <div style={{
      height: 1,
      background: 'repeating-linear-gradient(to right, rgba(26,18,8,0.18) 0 3px, transparent 3px 6px)',
      margin: '12px 0 8px',
    }} />
  )
}

export function WMorningHero({ dark = true, briefingText, briefingLoading }: WMorningHeroProps) {
  const { user } = useAuth()
  const [recovery, setRecovery] = useState<RecoveryResult | null>(null)
  const [program, setProgram] = useState<ProgramState | null>(null)
  const [drinksAvg, setDrinksAvg] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    loadRecovery(user.id).then(setRecovery).catch(() => null)
    getProgram(user.id).then(setProgram).catch(() => null)
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - i * 86400000)
      return d.toISOString().substring(0, 10)
    })
    supabase
      .from('recovery_signals')
      .select('drinks_consumed')
      .eq('user_id', user.id)
      .in('signal_date', dates)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any[] | null }) => {
        const total = (data ?? []).reduce((s: number, r: any) => s + (r.drinks_consumed ?? 0), 0)
        setDrinksAvg(Math.round((total / 7) * 10) / 10)
      })
  }, [user])

  const score = recovery?.score ?? 0
  const tier = recovery?.tier ?? 'unknown'
  const tierColor = TIER_COLOR[tier]
  const wlwEvent = useAnchorEvent('wlw')
  const laborEvent = useAnchorEvent('labor_day')
  const wlwDays = daysUntil(wlwEvent.event_date)
  const laborDays = daysUntil(laborEvent.event_date)
  const { location } = useLocation()
  const locationStamp = location.elevationFt != null
    ? `${location.name.toUpperCase()} ${location.elevationFt.toLocaleString()}FT`
    : location.name.toUpperCase()
  const workoutTitle = program?.next_workout_title ?? 'TOTAL STRENGTH'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()

  return (
    <Glass dark={dark} span={12} pad={16}>
      {/* Top stamp row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, background: C.rust, borderRadius: 1 }} />
          <span className="mono" style={{
            fontSize: 'var(--fs-10)', letterSpacing: '0.14em',
            color: dark ? 'rgba(245,237,214,0.7)' : C.ink60,
          }}>MORNING · {locationStamp}</span>
        </div>
        <span className="mono" style={{ fontSize: 'var(--fs-10)', color: dark ? 'rgba(245,237,214,0.45)' : C.ink40 }}>
          {today}
        </span>
      </div>

      {/* Recovery gauge + prescription */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <RecoveryGauge score={score} tier={tier} size={104} />
        <div style={{ flex: 1, paddingTop: 4 }}>
          <div className="mono" style={{ fontSize: 'var(--fs-10)', color: dark ? C.teal : C.tealDk, letterSpacing: '0.15em' }}>
            PRESCRIPTION
          </div>
          <div className="badge" style={{
            fontSize: 'var(--fs-24)', lineHeight: 0.92, letterSpacing: '0.02em',
            color: dark ? C.cream : C.dark, marginTop: 4,
          }}>
            {workoutTitle.split('·')[0].trim().toUpperCase()}
          </div>
          {recovery && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
              <span style={{ width: 6, height: 6, background: tierColor, borderRadius: 1, flexShrink: 0 }} />
              <span className="mono" style={{ fontSize: 'var(--fs-10)', color: dark ? 'rgba(245,237,214,0.6)' : C.ink60 }}>
                {tier === 'go_hard' ? 'FULL INTENSITY' : tier === 'moderate' ? 'STEADY EFFORT' : 'KEEP IT EASY'} · {locationStamp}
              </span>
            </div>
          )}
        </div>
      </div>

      <Dotted />

      {/* Briefing */}
      <div className="mono" style={{ fontSize: 'var(--fs-10)', color: dark ? C.teal : C.tealDk, letterSpacing: '0.15em', marginBottom: 6 }}>
        MORNING BRIEFING
      </div>
      {briefingLoading ? (
        <div style={{ fontSize: 'var(--fs-14)', opacity: 0.4 }}>Generating…</div>
      ) : briefingText ? (
        <div style={{ fontSize: 'var(--fs-14)', lineHeight: 1.5, color: dark ? 'rgba(245,237,214,0.9)' : C.dark }}>
          {briefingText}
        </div>
      ) : (
        <div style={{ fontSize: 'var(--fs-14)', opacity: 0.4 }}>No briefing today.</div>
      )}

      <Dotted />

      {/* Bottom mini tiles */}
      <div style={{ display: 'flex', gap: 8 }}>
        <MiniTile
          label="DRINKS 7D"
          value={drinksAvg != null ? String(drinksAvg) : '—'}
          sub={drinksAvg != null && drinksAvg <= 2 ? '↓ ON TRACK' : '↑ HIGH'}
          accent={drinksAvg != null && drinksAvg <= 2 ? '#2A6F6C' : C.rust}
        />
        <MiniTile
          label="WLW 30K"
          value={wlwDays >= 0 ? String(wlwDays) : '—'}
          sub={wlwDays >= 0 ? 'DAYS' : 'PASSED'}
          accent={C.rust}
          tileDark
        />
        <MiniTile
          label="LABOR DAY"
          value={laborDays >= 0 ? String(laborDays) : '—'}
          sub={laborDays >= 0 ? 'DAYS' : 'PASSED'}
          accent="#8B3A1E"
        />
      </div>
    </Glass>
  )
}
