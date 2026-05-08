import { Header } from '../ui/Header'
import { WReview } from './widgets/WReview'
import { WDrinkEntry } from './widgets/WDrinkEntry'
import { WTomorrow } from './widgets/WTomorrow'
import { WCalendar } from './widgets/WCalendar'
import { WInspire } from './widgets/WInspire'
import { WForecast } from './widgets/WForecast'
import { WPilots } from './widgets/WPilots'
import type { InspirationPhoto } from '../../hooks/useInspiration'

interface EveningViewProps {
  inspirationPhoto: InspirationPhoto | null
  onInspireExpand?: (photo: InspirationPhoto) => void
}

export function EveningView({ inspirationPhoto, onInspireExpand }: EveningViewProps) {
  return (
    <>
      <Header sub="LOG · TOMORROW PREVIEW · MIND IS YOURS" dark />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 10, padding: '0 14px 100px',
      }}>
        <WReview dark />
        <WDrinkEntry dark />
        <WTomorrow dark />
        <WCalendar dark span={12} />
        <WInspire
          dark
          photo={inspirationPhoto}
          onExpand={() => inspirationPhoto && onInspireExpand?.(inspirationPhoto)}
        />
        <WForecast dark />
        <WPilots dark />
      </div>
    </>
  )
}
