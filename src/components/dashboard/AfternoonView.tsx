import { Header } from '../ui/Header'
import { W4PM } from './widgets/W4PM'
import { WKids } from './widgets/WKids'
import { WInspire } from './widgets/WInspire'
import { WWeather } from './widgets/WWeather'
import { WMIT } from './widgets/WMIT'
import { WDrinks } from './widgets/WDrinks'

interface AfternoonViewProps { onInspireExpand?: (photo: string, year: string, place: string) => void }

export function AfternoonView({ onInspireExpand }: AfternoonViewProps) {
  return (
    <>
      <Header greeting="3:42 · 4pm hour" sub="KIDS HOME 3:45 · DRY WINDOW UNTIL 6" dark />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 10, padding: '0 14px 100px',
      }}>
        <W4PM dark />
        <WKids dark />
        <WInspire
          dark photo="/photos/camp-tacos.jpg" year="2023" place="Yampa · taco night w/ dad"
          onExpand={() => onInspireExpand?.('/photos/camp-tacos.jpg', '2023', 'Yampa · taco night w/ dad')}
        />
        <WInspire
          dark photo="/photos/igloo-kids.jpg" year="2024" place="Howard · kids' igloo"
          onExpand={() => onInspireExpand?.('/photos/igloo-kids.jpg', '2024', "Howard · kids' igloo")}
        />
        <WWeather dark />
        <WMIT dark />
        <WDrinks dark />
      </div>
    </>
  )
}
