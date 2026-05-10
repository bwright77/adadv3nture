import { Header } from '../ui/Header'
import { WReview } from './widgets/WReview'
import { WDrinkEntry } from './widgets/WDrinkEntry'
import { WTomorrow } from './widgets/WTomorrow'
import { WCalendar } from './widgets/WCalendar'
import { WInspire } from './widgets/WInspire'
import { WForecast } from './widgets/WForecast'
import { WPilots } from './widgets/WPilots'
import { WWeekAhead } from './widgets/WWeekAhead'
import type { WeekendBlock } from '../../hooks/useDayType'
import type { TimeOfDay } from '../../hooks/useTimeOfDay'

type ListTab = 'training' | 'career' | 'family' | 'home' | 'projects'

interface Props {
  weekendBlock: WeekendBlock
  isOverride: boolean
  onSetWeekendBlock: (wb: WeekendBlock | null) => void
  onOpenListTab?: (tab: ListTab) => void
}

// Sunday evening shifts back toward weekday prep.
// WWeekAhead widget added here in a future batch.
export function WeekendSundayEveningView({ weekendBlock, isOverride, onSetWeekendBlock, onOpenListTab }: Props) {
  const dummyTod: TimeOfDay = 'evening'

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
        <WWeekAhead dark />
        <WReview dark />
        <WDrinkEntry dark />
        <WTomorrow dark />
        <WCalendar dark span={12} />
        <WInspire dark />
        <WForecast dark />
        <WPilots dark onNavigate={onOpenListTab} />
      </div>
    </>
  )
}
