import { useState, useEffect } from 'react'
import { Header } from '../ui/Header'
import { WMorningHero } from './widgets/WMorningHero'
import { WWorkout } from './widgets/WWorkout'
import { WThinkingPrompt } from './widgets/WThinkingPrompt'
import { WDrinks } from './widgets/WDrinks'
import { WSteps } from './widgets/WSteps'
import { WInspire } from './widgets/WInspire'
import { WCalendar } from './widgets/WCalendar'
import { W50Hikes } from './widgets/W50Hikes'
import { WWeatherFull } from './widgets/WWeatherFull'
import { WAdventureToday } from './widgets/WAdventureToday'
import { WFamilyDay } from './widgets/WFamilyDay'
import { useAuth } from '../../contexts/AuthContext'
import { loadRecovery } from '../../lib/recovery'
import { supabase } from '../../lib/supabase'
import { useAnchorEvent } from '../../hooks/useAnchorEvent'
import { daysUntilDate } from '../../lib/anchorEvents'
import type { WeekendBlock } from '../../hooks/useDayType'
import type { TimeOfDay } from '../../hooks/useTimeOfDay'

interface Props {
  weekendBlock: WeekendBlock
  isOverride: boolean
  onSetWeekendBlock: (wb: WeekendBlock | null) => void
}

interface BriefingData {
  briefing: string
  thinking_prompt: string | null
}

function LockStrip({ userId }: { userId: string | undefined }) {
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null)
  const wlw = useAnchorEvent('wlw')
  const wlwDays = daysUntilDate(wlw.event_date)

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
          <span className="mono" style={{ fontSize: 'var(--fs-10)', color: 'rgba(245,237,214,0.65)', letterSpacing: '0.14em' }}>{chip.label}</span>
          <span className="badge" style={{ fontSize: 'var(--fs-13)', color: 'rgba(245,237,214,0.95)', letterSpacing: '0.02em' }}>{chip.value}</span>
        </div>
      ))}
    </div>
  )
}

export function WeekendDawnView({ weekendBlock, isOverride, onSetWeekendBlock }: Props) {
  const { user } = useAuth()
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setBriefingLoading(true)
    supabase.functions.invoke<BriefingData>('morning-briefing', { body: { day_type: 'weekend' } })
      .then(({ data, error }) => { if (!error && data) setBriefingData(data) })
      .finally(() => setBriefingLoading(false))
  }, [user])

  // Header needs activeTod prop; pass a dummy since weekend header uses weekendBlock
  const dummyTod: TimeOfDay = 'morning'

  return (
    <>
      <Header
        activeTod={dummyTod}
        isOverride={false}
        onSetOverride={() => null}
        weekendBlock={weekendBlock}
        isWeekendOverride={isOverride}
        onSetWeekendBlock={onSetWeekendBlock}
        dark
      />
      <LockStrip userId={user?.id} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 10, padding: '0 14px 100px' }}>
        <WMorningHero dark briefingText={briefingData?.briefing ?? null} briefingLoading={briefingLoading} />
        <WWorkout dark />
        <WThinkingPrompt dark prompt={briefingData?.thinking_prompt ?? null} loading={briefingLoading} />
        <WDrinks dark span={6} />
        <WSteps dark span={6} />
        <WCalendar dark span={12} />
        <WInspire dark span={12} />
        <WWeatherFull dark />
        <WFamilyDay dark />
        <WAdventureToday dark />
        <W50Hikes dark />
      </div>
    </>
  )
}
