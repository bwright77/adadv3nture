import { useState, useEffect } from 'react'
import { Header } from '../ui/Header'
import { useAnchorEvent } from '../../hooks/useAnchorEvent'
import { daysUntil, formatCountdownChip } from '../../lib/countdown'
import { useLocation } from '../../hooks/useLocation'
import { WMorningHero } from './widgets/WMorningHero'
import { WWorkout } from './widgets/WWorkout'
import { WThinkingPrompt } from './widgets/WThinkingPrompt'
import { WWeather } from './widgets/WWeather'
import { WDrinks } from './widgets/WDrinks'
import { WSteps } from './widgets/WSteps'
import { WMIT } from './widgets/WMIT'
import { WInspire } from './widgets/WInspire'
import { WForecast } from './widgets/WForecast'
import { WLaborDay } from './widgets/WLaborDay'
import { WCalendar } from './widgets/WCalendar'
import { WReview } from './widgets/WReview'
import { useAuth } from '../../contexts/AuthContext'
import { loadRecovery } from '../../lib/recovery'
import { supabase } from '../../lib/supabase'
import { getPlanForDate, isPlanReviewEmpty } from '../../lib/daily-plan'
import { logicalYesterday, formatFullDate } from '../../lib/utils'
import { C } from '../../tokens'
import type { TimeOfDay } from '../../hooks/useTimeOfDay'

interface MorningViewProps {
  activeTod: TimeOfDay
  isOverride: boolean
  onSetOverride: (tod: TimeOfDay | null) => void
}

interface BriefingData {
  briefing: string
  thinking_prompt: string | null
}

function LockStrip({ userId }: { userId: string | undefined }) {
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null)
  const wlw = useAnchorEvent('wlw')
  const wlwDays = daysUntil(wlw.event_date)
  const { location } = useLocation()

  useEffect(() => {
    if (!userId) return
    loadRecovery(userId).then(r => setRecoveryScore(r.score)).catch(() => null)
  }, [userId])

  const locationValue = location.elevationFt != null
    ? `${location.elevationFt.toLocaleString()}FT`
    : '—'

  return (
    <div style={{ padding: '4px 14px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {[
        { label: location.name.toUpperCase(), value: locationValue },
        { label: 'WLW', value: formatCountdownChip(wlwDays) },
        ...(recoveryScore !== null ? [{ label: 'REC', value: String(recoveryScore) }] : []),
      ].map(chip => (
        <div key={chip.label} style={{
          padding: '5px 10px', borderRadius: 999,
          background: 'rgba(26,18,8,0.35)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          border: '0.5px solid rgba(245,237,214,0.18)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span className="mono" style={{ fontSize: 'var(--fs-10)', color: 'rgba(245,237,214,0.65)', letterSpacing: '0.14em' }}>
            {chip.label}
          </span>
          <span className="badge" style={{ fontSize: 'var(--fs-13)', color: 'rgba(245,237,214,0.95)', letterSpacing: '0.02em' }}>
            {chip.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function MorningView({ activeTod, isOverride, onSetOverride }: MorningViewProps) {
  const { user } = useAuth()
  const { location, loading: locationLoading } = useLocation()
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(true)
  // null while we check; true means yesterday is unreviewed → block briefing.
  const [yesterdayGate, setYesterdayGate] = useState<boolean | null>(null)
  const yesterday = logicalYesterday()

  // Check yesterday's MIT row once on mount (and after a save clears it).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    getPlanForDate(user.id, yesterday)
      .then(p => { if (!cancelled) setYesterdayGate(isPlanReviewEmpty(p)) })
      .catch(() => { if (!cancelled) setYesterdayGate(false) })
    return () => { cancelled = true }
  }, [user, yesterday])

  // Fire the briefing only once yesterday's gate is cleared.
  useEffect(() => {
    if (!user || locationLoading || yesterdayGate !== false) return
    setBriefingLoading(true)
    supabase.functions.invoke<BriefingData>('morning-briefing', {
      body: {
        location: {
          lat: location.lat,
          lon: location.lon,
          name: location.name,
          elevation_ft: location.elevationFt,
        },
      },
    })
      .then(({ data, error }) => {
        if (!error && data) setBriefingData(data)
      })
      .finally(() => setBriefingLoading(false))
  }, [user, locationLoading, location.lat, location.lon, yesterdayGate])

  async function recheckYesterday() {
    if (!user) return
    const p = await getPlanForDate(user.id, yesterday)
    setYesterdayGate(isPlanReviewEmpty(p))
  }

  if (yesterdayGate) {
    return (
      <>
        <Header activeTod={activeTod} isOverride={isOverride} onSetOverride={onSetOverride} dark />
        <LockStrip userId={user?.id} />
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
          gap: 10, padding: '0 14px 100px',
        }}>
          <div style={{ gridColumn: 'span 12', padding: '8px 4px 0' }}>
            <div className="mono" style={{
              fontSize: 'var(--fs-10)', letterSpacing: '0.15em',
              color: 'rgba(245,237,214,0.55)', marginBottom: 4,
            }}>
              ◆ FIRST · LOG YESTERDAY
            </div>
            <div style={{ fontSize: 'var(--fs-14)', color: C.cream, lineHeight: 1.45, opacity: 0.85 }}>
              Close out {formatFullDate(yesterday)} so the morning briefing has something honest to read. The briefing will run as soon as one entry lands.
            </div>
          </div>
          <WReview dark forDate={yesterday} labelOverride={`Yesterday in review · ${formatFullDate(yesterday)}`} onSaved={recheckYesterday} />
        </div>
      </>
    )
  }

  return (
    <>
      <Header activeTod={activeTod} isOverride={isOverride} onSetOverride={onSetOverride} dark />
      <LockStrip userId={user?.id} />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 10, padding: '0 14px 100px',
      }}>
        <WMorningHero dark briefingText={briefingData?.briefing ?? null} briefingLoading={briefingLoading} />
        <WWorkout dark />
        <WThinkingPrompt dark prompt={briefingData?.thinking_prompt ?? null} loading={briefingLoading} />
        <WWeather dark />
        <WDrinks dark />
        <WSteps dark />
        <WCalendar dark span={12} />
        <WMIT dark />
        <WInspire dark span={8} />
        <WForecast dark />
        <WLaborDay dark />
      </div>
    </>
  )
}
