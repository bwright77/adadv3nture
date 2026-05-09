import { Header } from '../ui/Header'
import { WReview } from './widgets/WReview'
import { WDrinkEntry } from './widgets/WDrinkEntry'
import { WTomorrow } from './widgets/WTomorrow'
import { WCalendar } from './widgets/WCalendar'
import { WInspire } from './widgets/WInspire'
import { WForecast } from './widgets/WForecast'
import { WPilots } from './widgets/WPilots'
import type { TimeOfDay } from '../../hooks/useTimeOfDay'

type ListTab = 'training' | 'career' | 'family' | 'home' | 'projects'

interface EveningViewProps {
  activeTod: TimeOfDay
  isOverride: boolean
  onSetOverride: (tod: TimeOfDay | null) => void
  onOpenListTab?: (tab: ListTab) => void
}

export function EveningView({ activeTod, isOverride, onSetOverride, onOpenListTab }: EveningViewProps) {
  return (
    <>
      <Header activeTod={activeTod} isOverride={isOverride} onSetOverride={onSetOverride} dark />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 10, padding: '0 14px 100px',
      }}>
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
