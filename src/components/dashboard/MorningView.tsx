import { useState, useEffect } from 'react'
import { Header } from '../ui/Header'
import { WBriefing } from './widgets/WBriefing'
import { WWorkout } from './widgets/WWorkout'
import { WThinkingPrompt } from './widgets/WThinkingPrompt'
import { WRecovery } from './widgets/WRecovery'
import { WWeather } from './widgets/WWeather'
import { WDrinks } from './widgets/WDrinks'
import { WMIT } from './widgets/WMIT'
import { WInspire } from './widgets/WInspire'
import { WForecast } from './widgets/WForecast'
import { WLaborDay } from './widgets/WLaborDay'
import { WCalendar } from './widgets/WCalendar'
import { useAuth } from '../../contexts/AuthContext'
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
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 10, padding: '0 14px 100px',
      }}>
        <WBriefing dark loading={briefingLoading} text={briefingData?.briefing ?? null} />
        <WWorkout dark />
        <WThinkingPrompt dark prompt={briefingData?.thinking_prompt ?? null} loading={briefingLoading} />
        <WRecovery dark />
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
