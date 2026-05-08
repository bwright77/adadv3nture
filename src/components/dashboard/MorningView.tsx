import { useState, useEffect } from 'react'
import { Header } from '../ui/Header'
import { WMorningHero } from './widgets/WMorningHero'
import { WWorkout } from './widgets/WWorkout'
import { WThinkingPrompt } from './widgets/WThinkingPrompt'
import { WWeather } from './widgets/WWeather'
import { WDrinks } from './widgets/WDrinks'
import { WMIT } from './widgets/WMIT'
import { WInspire } from './widgets/WInspire'
import { WForecast } from './widgets/WForecast'
import { WLaborDay } from './widgets/WLaborDay'
import { WCalendar } from './widgets/WCalendar'
import { useAuth } from '../../contexts/AuthContext'
import { loadRecovery } from '../../lib/recovery'
import { supabase } from '../../lib/supabase'
import type { InspirationPhoto } from '../../hooks/useInspiration'

interface MorningViewProps {
  inspirationPhoto: InspirationPhoto | null
  onInspireExpand?: (photo: InspirationPhoto) => void
}

interface BriefingData {
  briefing: string
  thinking_prompt: string | null
}

function LockStrip({ userId }: { userId: string | undefined }) {
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null)
  const wlwDays = Math.ceil((new Date('2026-09-26').getTime() - Date.now()) / 86_400_000)

  useEffect(() => {
    if (!userId) return
    loadRecovery(userId).then(r => setRecoveryScore(r.score)).catch(() => null)
  }, [userId])

  return (
    <div style={{ padding: '4px 14px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {[
        { label: 'DENVER', value: '5,318FT' },
        { label: 'WLW', value: `${wlwDays}D` },
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

export function MorningView({ inspirationPhoto, onInspireExpand }: MorningViewProps) {
  const { user } = useAuth()
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setBriefingLoading(true)
    supabase.functions.invoke<BriefingData>('morning-briefing')
      .then(({ data, error }) => {
        if (!error && data) setBriefingData(data)
      })
      .finally(() => setBriefingLoading(false))
  }, [user])

  return (
    <>
      <Header sub="DENVER · BOOT CAMP" dark />
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
        <WCalendar dark span={12} />
        <WMIT dark />
        <WInspire
          dark
          photo={inspirationPhoto}
          onExpand={() => inspirationPhoto && onInspireExpand?.(inspirationPhoto)}
        />
        <WForecast dark />
        <WLaborDay dark />
      </div>
    </>
  )
}
