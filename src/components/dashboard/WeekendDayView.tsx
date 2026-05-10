import { Header } from '../ui/Header'
import { WCalendar } from './widgets/WCalendar'
import { WInbox } from './widgets/WInbox'
import { WDrinks } from './widgets/WDrinks'
import { WSteps } from './widgets/WSteps'
import { WWeather } from './widgets/WWeather'
import { WInspire } from './widgets/WInspire'
import { WWorkout } from './widgets/WWorkout'
import { WForecast } from './widgets/WForecast'
import { W50Hikes } from './widgets/W50Hikes'
import type { WeekendBlock } from '../../hooks/useDayType'
import type { TimeOfDay } from '../../hooks/useTimeOfDay'

interface Props {
  weekendBlock: WeekendBlock
  isOverride: boolean
  onSetWeekendBlock: (wb: WeekendBlock | null) => void
}

export function WeekendDayView({ weekendBlock, isOverride, onSetWeekendBlock }: Props) {
  const dummyTod: TimeOfDay = 'mid-morning'

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 10, padding: '0 14px 100px' }}>
        <WWorkout dark />
        <WCalendar dark span={12} />
        <WInbox dark />
        <WDrinks dark />
        <WSteps dark />
        <WWeather dark />
        <WInspire dark />
        <WForecast dark />
        <W50Hikes dark />
      </div>
    </>
  )
}
