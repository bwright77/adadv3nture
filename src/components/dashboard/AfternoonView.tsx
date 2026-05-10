import { Header } from '../ui/Header'
import { W4PM } from './widgets/W4PM'
import { WKids } from './widgets/WKids'
import { WInspire } from './widgets/WInspire'
import { WWeather } from './widgets/WWeather'
import { WMIT } from './widgets/WMIT'
import { WDrinks } from './widgets/WDrinks'
import { WSteps } from './widgets/WSteps'
import { WCalendar } from './widgets/WCalendar'
import type { TimeOfDay } from '../../hooks/useTimeOfDay'

interface AfternoonViewProps {
  activeTod: TimeOfDay
  isOverride: boolean
  onSetOverride: (tod: TimeOfDay | null) => void
}

export function AfternoonView({ activeTod, isOverride, onSetOverride }: AfternoonViewProps) {
  return (
    <>
      <Header activeTod={activeTod} isOverride={isOverride} onSetOverride={onSetOverride} dark />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 10, padding: '0 14px 100px',
      }}>
        <W4PM dark />
        <WKids dark />
        <WInspire dark span={8} />
        <WWeather dark />
        <WCalendar dark span={12} />
        <WMIT dark />
        <WDrinks dark />
        <WSteps dark />
      </div>
    </>
  )
}
