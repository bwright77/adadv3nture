import { Header } from '../ui/Header'
import { W4PM } from './widgets/W4PM'
import { WKids } from './widgets/WKids'
import { WInspire } from './widgets/WInspire'
import { WWeather } from './widgets/WWeather'
import { WMIT } from './widgets/WMIT'
import { WDrinks } from './widgets/WDrinks'
import { WCalendar } from './widgets/WCalendar'
import type { InspirationPhoto } from '../../hooks/useInspiration'
import type { TimeOfDay } from '../../hooks/useTimeOfDay'

interface AfternoonViewProps {
  inspirationPhoto: InspirationPhoto | null
  onInspireExpand?: (photo: InspirationPhoto) => void
  activeTod: TimeOfDay
  isOverride: boolean
  onSetOverride: (tod: TimeOfDay | null) => void
}

export function AfternoonView({ inspirationPhoto, onInspireExpand, activeTod, isOverride, onSetOverride }: AfternoonViewProps) {
  return (
    <>
      <Header activeTod={activeTod} isOverride={isOverride} onSetOverride={onSetOverride} dark />
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
        <WCalendar dark span={12} />
        <WMIT dark />
        <WDrinks dark />
      </div>
    </>
  )
}
