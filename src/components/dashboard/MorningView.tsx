import { Header } from '../ui/Header'
import { WBriefing } from './widgets/WBriefing'
import { WWorkout } from './widgets/WWorkout'
import { WRecovery } from './widgets/WRecovery'
import { WWeather } from './widgets/WWeather'
import { WDrinks } from './widgets/WDrinks'
import { WMIT } from './widgets/WMIT'
import { WInspire } from './widgets/WInspire'
import { WLaborDay } from './widgets/WLaborDay'
import { WCalendar } from './widgets/WCalendar'
import type { InspirationPhoto } from '../../hooks/useInspiration'

interface MorningViewProps {
  inspirationPhoto: InspirationPhoto | null
  onInspireExpand?: (photo: InspirationPhoto) => void
}

export function MorningView({ inspirationPhoto, onInspireExpand }: MorningViewProps) {
  return (
    <>
      <Header greeting="Wed · May 7" sub="DENVER · 54° CLEAR · BOOT CAMP D1" dark />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 10, padding: '0 14px 100px',
      }}>
        <WBriefing dark />
        <WWorkout dark />
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
        <WLaborDay dark />
      </div>
    </>
  )
}
