import { Header } from '../ui/Header'
import { W4PM } from './widgets/W4PM'
import { WKids } from './widgets/WKids'
import { WInspire } from './widgets/WInspire'
import { WWeather } from './widgets/WWeather'
import { WMIT } from './widgets/WMIT'
import { WDrinks } from './widgets/WDrinks'
import type { InspirationPhoto } from '../../hooks/useInspiration'

interface AfternoonViewProps {
  inspirationPhoto: InspirationPhoto | null
  onInspireExpand?: (photo: InspirationPhoto) => void
}

export function AfternoonView({ inspirationPhoto, onInspireExpand }: AfternoonViewProps) {
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
          dark
          photo={inspirationPhoto}
          onExpand={() => inspirationPhoto && onInspireExpand?.(inspirationPhoto)}
        />
        <WWeather dark />
        <WMIT dark />
        <WDrinks dark />
      </div>
    </>
  )
}
