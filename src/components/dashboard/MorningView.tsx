import { Header } from '../ui/Header'
import { WBriefing } from './widgets/WBriefing'
import { WWorkout } from './widgets/WWorkout'
import { WRecovery } from './widgets/WRecovery'
import { WWeather } from './widgets/WWeather'
import { WDrinks } from './widgets/WDrinks'
import { WMIT } from './widgets/WMIT'
import { WInspire } from './widgets/WInspire'
import { WLaborDay } from './widgets/WLaborDay'

interface MorningViewProps { onInspireExpand?: (photo: string, year: string, place: string) => void }

export function MorningView({ onInspireExpand }: MorningViewProps) {
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
        <WMIT dark />
        <WInspire
          dark photo="/photos/ski-summit.jpg" year="2021" place="Berthoud Pass · skin lap"
          onExpand={() => onInspireExpand?.('/photos/ski-summit.jpg', '2021', 'Berthoud Pass · skin lap')}
        />
        <WLaborDay dark />
      </div>
    </>
  )
}
