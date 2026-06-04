import { Header } from '../ui/Header'
import { WCalendar } from './widgets/WCalendar'
import { WInbox } from './widgets/WInbox'
import { WDrinks } from './widgets/WDrinks'
import { WSteps } from './widgets/WSteps'
import { WInspire } from './widgets/WInspire'
import { WWorkout } from './widgets/WWorkout'
import { WFamilyHikes } from './widgets/WFamilyHikes'
import { WWeatherFull } from './widgets/WWeatherFull'
import { WAdventureToday } from './widgets/WAdventureToday'
import { WLongEffort } from './widgets/WLongEffort'
import { WProjectSession } from './widgets/WProjectSession'
import type { WeekendBlock } from '../../hooks/useDayType'
import type { TimeOfDay } from '../../hooks/useTimeOfDay'

interface Props {
  weekendBlock: WeekendBlock
  isOverride: boolean
  onSetWeekendBlock: (wb: WeekendBlock | null) => void
  onOpenInbox?: () => void
  hideHeader?: boolean
}

export function WeekendDayView({ weekendBlock, isOverride, onSetWeekendBlock, onOpenInbox, hideHeader }: Props) {
  const dummyTod: TimeOfDay = 'mid-morning'

  return (
    <>
      {!hideHeader && (
        <Header
          activeTod={dummyTod}
          isOverride={false}
          onSetOverride={() => null}
          weekendBlock={weekendBlock}
          isWeekendOverride={isOverride}
          onSetWeekendBlock={onSetWeekendBlock}
          dark
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 10, padding: '0 14px 100px' }}>
        <WAdventureToday dark />
        <WWorkout dark span={12} />
        <WCalendar dark span={12} />
        <WInbox dark span={12} onOpen={onOpenInbox} />
        <WDrinks dark span={6} />
        <WSteps dark span={6} />
        <WLongEffort dark />
        <WProjectSession dark />
        <WWeatherFull dark />
        <WInspire dark span={12} />
        <WFamilyHikes dark />
      </div>
    </>
  )
}
