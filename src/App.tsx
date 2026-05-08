import { useState, useEffect } from 'react'
import { useTimeOfDay, useBgPhoto, type TimeOfDay } from './hooks/useTimeOfDay'
import { useInspiration } from './hooks/useInspiration'
import type { InspirationPhoto } from './hooks/useInspiration'
import type { Tab } from './components/ui/TabBar'
type ListsTab = 'training' | 'career' | 'family' | 'home' | 'projects'
import { TabBar } from './components/ui/TabBar'
import { FAB } from './components/ui/FAB'
import { MorningView } from './components/dashboard/MorningView'
import { MidMorningView } from './components/dashboard/MidMorningView'
import { AfternoonView } from './components/dashboard/AfternoonView'
import { EveningView } from './components/dashboard/EveningView'
import { InboxPage } from './pages/InboxPage'
import { TrendsPage } from './pages/TrendsPage'
import { LogPage } from './pages/LogPage'
import { TodosPage } from './pages/TodosPage'
import { CaptureSheet } from './components/inbox/CaptureSheet'
import { InspireDetail } from './components/dashboard/InspireDetail'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { C } from './tokens'

const VEIL: Record<string, string> = {
  'morning':     'linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.6) 100%)',
  'mid-morning': 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%)',
  'afternoon':   'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)',
  'evening':     'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)',
}

function Dashboard() {
  const realTod = useTimeOfDay()
  const [todOverride, setTodOverride] = useState<TimeOfDay | null>(null)
  const tod = todOverride ?? realTod

  // Auto-clear override when real time naturally transitions to a new block
  useEffect(() => { setTodOverride(null) }, [realTod])

  const bgPhoto = useBgPhoto(tod)
  const todayPhoto = useInspiration()
  const [tab, setTab] = useState<Tab>(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('strava') === 'connected') {
      window.history.replaceState({}, '', '/')
      return 'log'
    }
    if (params.get('google') === 'connected') {
      window.history.replaceState({}, '', '/')
    }
    return 'home'
  })
  const [capture, setCapture] = useState(false)
  const [inspirePhoto, setInspirePhoto] = useState<InspirationPhoto | null>(null)
  const [listsInitialTab, setListsInitialTab] = useState<ListsTab | undefined>(undefined)

  function openCareer() {
    setTab('lists')
    setListsInitialTab('career')
  }

  const isDark = tab === 'home'

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: C.dark, overflowX: 'hidden' }}>

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

      <div style={{
        position: 'relative', zIndex: 2,
        overflowY: 'auto', overflowX: 'hidden',
        minHeight: '100dvh',
      }}>
        {tab === 'home' && <div style={{ height: 'calc(env(safe-area-inset-top, 16px) + 28px)' }} />}

        {tab === 'home' && tod === 'morning'     && <MorningView     inspirationPhoto={todayPhoto} onInspireExpand={setInspirePhoto} activeTod={tod} isOverride={todOverride !== null} onSetOverride={setTodOverride} />}
        {tab === 'home' && tod === 'mid-morning' && <MidMorningView  inspirationPhoto={todayPhoto} onInspireExpand={setInspirePhoto} activeTod={tod} isOverride={todOverride !== null} onSetOverride={setTodOverride} onOpenCareer={openCareer} />}
        {tab === 'home' && tod === 'afternoon'   && <AfternoonView   inspirationPhoto={todayPhoto} onInspireExpand={setInspirePhoto} activeTod={tod} isOverride={todOverride !== null} onSetOverride={setTodOverride} />}
        {tab === 'home' && tod === 'evening'     && <EveningView     inspirationPhoto={todayPhoto} onInspireExpand={setInspirePhoto} activeTod={tod} isOverride={todOverride !== null} onSetOverride={setTodOverride} />}
        {tab === 'trends' && <TrendsPage bgPhoto={bgPhoto || undefined} />}
        {tab === 'lists'  && <TodosPage  bgPhoto={bgPhoto || undefined} initialTab={listsInitialTab} />}
        {tab === 'inbox'  && <InboxPage  bgPhoto={bgPhoto || undefined} />}
        {tab === 'log'    && <LogPage />}
      </div>

      <TabBar active={tab} dark={isDark} onChange={setTab} />
      <FAB onClick={() => setCapture(true)} />

      {capture && <CaptureSheet onClose={() => setCapture(false)} />}
      {inspirePhoto && (
        <InspireDetail
          photo={inspirePhoto}
          onClose={() => setInspirePhoto(null)}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}
