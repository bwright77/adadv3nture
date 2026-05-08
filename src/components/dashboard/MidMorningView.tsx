import { Header } from '../ui/Header'
import { WWA } from './widgets/WWA'
import { WInbox } from './widgets/WInbox'
import { WMIT } from './widgets/WMIT'
import { WDrinks } from './widgets/WDrinks'
import { WWeather } from './widgets/WWeather'
import { WInspire } from './widgets/WInspire'
import { WCalendar } from './widgets/WCalendar'
import type { InspirationPhoto } from '../../hooks/useInspiration'

interface MidMorningViewProps {
  inspirationPhoto: InspirationPhoto | null
  onInspireExpand?: (photo: InspirationPhoto) => void
}

export function MidMorningView({ inspirationPhoto, onInspireExpand }: MidMorningViewProps) {
  return (
    <>
      <Header sub="WA BLOCK · QUIET HOURS" dark />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 10, padding: '0 14px 100px',
      }}>
        <WWA dark />
        <WCalendar dark span={6} />
        <WInbox dark />
        <WMIT dark />
        <WDrinks dark />
        <WWeather dark />
        <WInspire
          dark
          photo={inspirationPhoto}
          onExpand={() => inspirationPhoto && onInspireExpand?.(inspirationPhoto)}
        />
      </div>
    </>
  )
}
