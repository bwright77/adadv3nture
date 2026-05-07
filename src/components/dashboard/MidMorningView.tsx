import { Header } from '../ui/Header'
import { Glass } from '../ui/Glass'
import { CardLabel } from '../ui/CardLabel'
import { WWA } from './widgets/WWA'
import { WInbox } from './widgets/WInbox'
import { WMIT } from './widgets/WMIT'
import { WDrinks } from './widgets/WDrinks'
import { WWeather } from './widgets/WWeather'
import { WInspire } from './widgets/WInspire'
import { C } from '../../tokens'

interface MidMorningViewProps { onInspireExpand?: (photo: string, year: string, place: string) => void }

const EVENTS = [
  { t: '9:30',  l: 'Triage + plan' },
  { t: '11:30', l: 'José + PFB' },
  { t: '2:30',  l: 'School pickup' },
]

export function MidMorningView({ onInspireExpand }: MidMorningViewProps) {
  return (
    <>
      <Header greeting="11:14 · WA block" sub="QUIET HOURS · INBOX TRIAGED · 2H30 LEFT" dark />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: 10, padding: '0 14px 100px',
      }}>
        <WWA dark />
        <Glass dark span={6} pad={14}>
          <CardLabel dark>Calendar · today</CardLabel>
          {EVENTS.map((e, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '5px 0',
              borderBottom: i < EVENTS.length - 1 ? '0.5px dashed rgba(255,255,255,0.15)' : 'none',
            }}>
              <span className="mono" style={{ fontSize: 10, color: C.teal, width: 30 }}>{e.t}</span>
              <span style={{ fontSize: 11 }}>{e.l}</span>
            </div>
          ))}
        </Glass>
        <WInbox dark />
        <WMIT dark />
        <WDrinks dark />
        <WWeather dark />
        <WInspire
          dark photo="/photos/river-canyon.jpg" year="2018" place="Gates of Lodore · day 2"
          onExpand={() => onInspireExpand?.('/photos/river-canyon.jpg', '2018', 'Gates of Lodore · day 2')}
        />
      </div>
    </>
  )
}
