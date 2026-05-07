import { useState } from 'react'
import { useTimeOfDay, BG_PHOTOS } from './hooks/useTimeOfDay'
import type { Tab } from './components/ui/TabBar'
import { TabBar } from './components/ui/TabBar'
import { FAB } from './components/ui/FAB'
import { MorningView } from './components/dashboard/MorningView'
import { MidMorningView } from './components/dashboard/MidMorningView'
import { AfternoonView } from './components/dashboard/AfternoonView'
import { EveningView } from './components/dashboard/EveningView'
import { InboxPage } from './pages/InboxPage'
import { TrendsPage } from './pages/TrendsPage'
import { CaptureSheet } from './components/inbox/CaptureSheet'
import { InspireDetail } from './components/dashboard/InspireDetail'
import { C } from './tokens'

interface InspireEntry { photo: string; year: string; place: string }

const VEIL: Record<string, string> = {
  'morning':     'linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.6) 100%)',
  'mid-morning': 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%)',
  'afternoon':   'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)',
  'evening':     'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)',
}

export default function App() {
  const tod = useTimeOfDay()
  const [tab, setTab] = useState<Tab>('home')
  const [capture, setCapture] = useState(false)
  const [inspire, setInspire] = useState<InspireEntry | null>(null)

  const isDark = tab === 'home'
  const bgPhoto = BG_PHOTOS[tod]

  const openInspire = (photo: string, year: string, place: string) => {
    setInspire({ photo, year, place })
  }

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: C.dark, overflowX: 'hidden' }}>

      {/* fixed background photo — only on today tab */}
      {tab === 'home' && (
        <>
          <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: `url(${bgPhoto}) center/cover no-repeat`,
          }} />
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1,
            background: VEIL[tod],
          }} />
        </>
      )}
      {tab !== 'home' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: C.paper }} />
      )}

      {/* scrollable content */}
      <div style={{
        position: 'relative', zIndex: 2,
        overflowY: 'auto', overflowX: 'hidden',
        minHeight: '100dvh',
        paddingTop: 'env(safe-area-inset-top, 16px)',
      }}>
        {/* status bar spacer */}
        <div style={{ height: 44 }} />

        {tab === 'home' && tod === 'morning'     && <MorningView     onInspireExpand={openInspire} />}
        {tab === 'home' && tod === 'mid-morning' && <MidMorningView  onInspireExpand={openInspire} />}
        {tab === 'home' && tod === 'afternoon'   && <AfternoonView   onInspireExpand={openInspire} />}
        {tab === 'home' && tod === 'evening'     && <EveningView     onInspireExpand={openInspire} />}
        {tab === 'trends' && <TrendsPage />}
        {tab === 'inbox'  && <InboxPage />}
        {tab === 'log'    && (
          <div style={{ padding: '20px 20px 100px', color: C.dark }}>
            <div className="badge" style={{ fontSize: 22 }}>LOG</div>
            <div style={{ fontSize: 14, opacity: 0.6, marginTop: 8 }}>
              Activity log — Strava sync coming in build step 08.
            </div>
          </div>
        )}
      </div>

      <TabBar active={tab} dark={isDark} onChange={setTab} />
      <FAB onClick={() => setCapture(true)} />

      {capture && <CaptureSheet onClose={() => setCapture(false)} />}
      {inspire && (
        <InspireDetail
          photo={inspire.photo}
          year={inspire.year}
          place={inspire.place}
          onClose={() => setInspire(null)}
        />
      )}
    </div>
  )
}
