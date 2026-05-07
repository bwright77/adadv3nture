import { Header } from '../ui/Header'
import { Glass } from '../ui/Glass'
import { CardLabel } from '../ui/CardLabel'
import { WReview } from './widgets/WReview'
import { WDrinkEntry } from './widgets/WDrinkEntry'
import { WInspire } from './widgets/WInspire'
import { WPilots } from './widgets/WPilots'
import { C } from '../../tokens'

interface EveningViewProps { onInspireExpand?: (photo: string, year: string, place: string) => void }

export function EveningView({ onInspireExpand }: EveningViewProps) {
  return (
    <>
      <Header greeting="8:11 · day's end" sub="LOG · TOMORROW PREVIEW · MIND IS YOURS" dark />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 10, padding: '0 14px 100px',
      }}>
        <WReview dark />
        <WDrinkEntry dark />
        <Glass dark span={12} pad={14}>
          <CardLabel dark>Tomorrow · Thu May 8</CardLabel>
          <div className="badge" style={{ fontSize: 13, marginTop: 2 }}>
            RUN CLUB · WASH PARK · 6PM <span style={{ color: C.teal }}>SACRED</span>
          </div>
          <div className="mono" style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
            AM · TS W1·D3 legs · PM · run club · family joins
          </div>
        </Glass>
        <WInspire
          dark photo="/photos/family-harbor.jpg" year="2024" place="Catalina · all five"
          onExpand={() => onInspireExpand?.('/photos/family-harbor.jpg', '2024', 'Catalina · all five')}
        />
        <WPilots dark />
      </div>
    </>
  )
}
