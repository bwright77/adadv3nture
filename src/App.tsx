import { useState, useEffect } from 'react'
import { useTimeOfDay, useBgPhoto, type TimeOfDay } from './hooks/useTimeOfDay'
import { useDayType, type WeekendBlock } from './hooks/useDayType'
import type { Tab } from './components/ui/TabBar'
type ListsTab = 'training' | 'career' | 'family' | 'home' | 'projects'
import { TabBar } from './components/ui/TabBar'
import { FAB } from './components/ui/FAB'
import { MorningView } from './components/dashboard/MorningView'
import { MidMorningView } from './components/dashboard/MidMorningView'
import { AfternoonView } from './components/dashboard/AfternoonView'
import { EveningView } from './components/dashboard/EveningView'
import { WeekendDawnView } from './components/dashboard/WeekendDawnView'
import { WeekendDayView } from './components/dashboard/WeekendDayView'
import { WeekendEveningView } from './components/dashboard/WeekendEveningView'
import { WeekendSundayEveningView } from './components/dashboard/WeekendSundayEveningView'
import { FireBanner } from './components/dashboard/FireBanner'
import { AdventureHero } from './components/dashboard/AdventureHero'
import { WWAWeek } from './components/dashboard/WWAWeek'
import { SummerSnapshots } from './components/dashboard/SummerSnapshots'
import { isSummerDate } from './hooks/useSummerMode'
import { useWeekType } from './hooks/useWeekType'
import { logicalToday } from './lib/utils'
import type { TodoCategory } from './lib/todos'
import { InboxPage } from './pages/InboxPage'
import { TrendsPage } from './pages/TrendsPage'
import { LogPage } from './pages/LogPage'
import { TodosPage } from './pages/TodosPage'
import { CaptureSheet } from './components/inbox/CaptureSheet'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { C } from './tokens'

const VEIL: Record<string, string> = {
  'morning':             'linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.6) 100%)',
  'mid-morning':         'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%)',
  'afternoon':           'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)',
  'evening':             'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)',
  'weekend-dawn':        'linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.55) 100%)',
  'weekend-day':         'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%)',
  'weekend-evening-sat': 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)',
  'weekend-evening-sun': 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%)',
}

function Dashboard() {
  const realTod = useTimeOfDay()
  const [todOverride, setTodOverride] = useState<TimeOfDay | null>(null)
  const tod = todOverride ?? realTod
  useEffect(() => { setTodOverride(null) }, [realTod])

  const { dayType, weekendBlock: realWb } = useDayType()
  const [wbOverride, setWbOverride] = useState<WeekendBlock | null>(null)
  // 'weekend-evening-sat' is the picker's stand-in for both evening blocks;
  // on Sunday, resolve it to the Sunday view rather than Saturday's
  const wb = (() => {
    if (!wbOverride) return realWb
    if (wbOverride === 'weekend-evening-sat' && realWb === 'weekend-evening-sun') return 'weekend-evening-sun'
    return wbOverride
  })()
  useEffect(() => { setWbOverride(null) }, [realWb])

  // Summer Mode — auto-activates on the date range; override (e.g. "normal day")
  // auto-clears when the real season flips, mirroring the time-of-day override.
  const realSummer = isSummerDate(logicalToday())
  const [summerOverride, setSummerOverride] = useState<boolean | null>(null)
  const summerMode = summerOverride ?? realSummer
  useEffect(() => { setSummerOverride(null) }, [realSummer])
  const { weekType, setWeekType } = useWeekType()

  const activeVeilKey = dayType === 'weekend' ? wb : tod
  const bgPhoto = useBgPhoto(tod)

  const [tab, setTab] = useState<Tab>(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('strava') === 'connected' || params.get('withings') === 'connected') {
      window.history.replaceState({}, '', '/')
      return 'log'
    }
    if (params.get('google') === 'connected') {
      window.history.replaceState({}, '', '/')
    }
    return 'home'
  })
  const [capture, setCapture] = useState(false)
  const [inboxVersion, setInboxVersion] = useState(0)
  const [dataVersion, setDataVersion] = useState(0)
  const [listsInitialTab, setListsInitialTab] = useState<ListsTab | undefined>(undefined)
  // When set, the Training tab opens this event's EventDetail on mount.
  // Bumped each time openTrainingEvent fires so subsequent clicks to the
  // same event still re-open the modal (TrainingView clears its own copy
  // once it consumes the value).
  const [initialTrainingEventId, setInitialTrainingEventId] = useState<{ id: string; version: number } | undefined>(undefined)

  // Bumped after a Strava / Withings sync — components that derive from
  // those data sources (TrendsPage, anything reading activities or
  // body_metrics) include this in their effect deps to refetch.
  const bumpData = () => setDataVersion(v => v + 1)

  // Browser back/forward moves between in-app views instead of leaving the site.
  // Each navigation pushes a history entry; popstate restores the prior view.
  useEffect(() => {
    window.history.replaceState({ appNav: true, tab, listsTab: listsInitialTab ?? null, capture: false }, '')
    function onPop(e: PopStateEvent) {
      const s = (e.state && e.state.appNav) ? e.state : { tab: 'home' as Tab, listsTab: null, capture: false }
      setTab(s.tab)
      setListsInitialTab(s.listsTab ?? undefined)
      setCapture(Boolean(s.capture))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function go(nextTab: Tab, listsTab?: ListsTab) {
    window.history.pushState({ appNav: true, tab: nextTab, listsTab: listsTab ?? null, capture: false }, '')
    setTab(nextTab)
    if (listsTab !== undefined) setListsInitialTab(listsTab)
  }

  function openCapture() {
    window.history.pushState({ appNav: true, tab, listsTab: listsInitialTab ?? null, capture: true }, '')
    setCapture(true)
  }
  function closeCapture() {
    if (window.history.state?.capture) window.history.back()
    else setCapture(false)
  }

  function openTrainingEvent(goalId: string) {
    go('lists', 'training')
    setInitialTrainingEventId(prev => ({ id: goalId, version: (prev?.version ?? 0) + 1 }))
  }

  function openCareer() {
    go('lists', 'career')
  }

  function openListTab(subTab: ListsTab) {
    go('lists', subTab)
  }

  const openInbox = () => go('inbox')

  function openFireTodo(category: TodoCategory) {
    openListTab(category === 'body' ? 'training' : category)
  }

  const isDark = tab === 'home'

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: C.dark, overflowX: 'clip' }}>

      {tab === 'home' && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: `url(${bgPhoto}) center/cover no-repeat` }} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: VEIL[activeVeilKey] }} />
        </>
      )}
      {tab !== 'home' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: C.paper }} />
      )}

      <div style={{ position: 'relative', zIndex: 2, overflowX: 'clip', minHeight: '100dvh' }}>
        {tab === 'home' && <div style={{ height: 'calc(env(safe-area-inset-top, 16px) + 28px)' }} />}

        {/* Summer band — adventure on top, structure quiet underneath. Its own
            grid above the time-of-day View. Card mix re-weights by week-type:
            solo = full, camp = lean + WA focus, weekend = delight, no career. */}
        {tab === 'home' && summerMode && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 10, padding: '0 14px 10px' }}>
            <FireBanner onOpen={openFireTodo} />
            <AdventureHero weekType={weekType} setWeekType={setWeekType} onExitSummer={() => setSummerOverride(false)} />
            {weekType !== 'weekend' && <WWAWeek dark />}
            {weekType !== 'camp' && <SummerSnapshots dark />}
          </div>
        )}

        {/* Weekday views */}
        {tab === 'home' && dayType === 'weekday' && tod === 'morning'     && <MorningView     activeTod={tod} isOverride={todOverride !== null} onSetOverride={setTodOverride} />}
        {tab === 'home' && dayType === 'weekday' && tod === 'mid-morning' && <MidMorningView  activeTod={tod} isOverride={todOverride !== null} onSetOverride={setTodOverride} onOpenCareer={openCareer} onOpenInbox={openInbox} />}
        {tab === 'home' && dayType === 'weekday' && tod === 'afternoon'   && <AfternoonView   activeTod={tod} isOverride={todOverride !== null} onSetOverride={setTodOverride} />}
        {tab === 'home' && dayType === 'weekday' && tod === 'evening'     && <EveningView     activeTod={tod} isOverride={todOverride !== null} onSetOverride={setTodOverride} onOpenListTab={openListTab} />}

        {/* Weekend views */}
        {tab === 'home' && dayType === 'weekend' && wb === 'weekend-dawn'        && <WeekendDawnView        weekendBlock={wb} isOverride={wbOverride !== null} onSetWeekendBlock={setWbOverride} />}
        {tab === 'home' && dayType === 'weekend' && wb === 'weekend-day'         && <WeekendDayView         weekendBlock={wb} isOverride={wbOverride !== null} onSetWeekendBlock={setWbOverride} onOpenInbox={openInbox} />}
        {tab === 'home' && dayType === 'weekend' && wb === 'weekend-evening-sat' && <WeekendEveningView     weekendBlock={wb} isOverride={wbOverride !== null} onSetWeekendBlock={setWbOverride} onOpenListTab={openListTab} />}
        {tab === 'home' && dayType === 'weekend' && wb === 'weekend-evening-sun' && <WeekendSundayEveningView weekendBlock={wb} isOverride={wbOverride !== null} onSetWeekendBlock={setWbOverride} onOpenListTab={openListTab} />}

        {tab === 'trends' && <TrendsPage bgPhoto={bgPhoto || undefined} version={dataVersion} onOpenTrainingEvent={openTrainingEvent} onOpenTrainingPlan={() => openListTab('training')} />}
        {tab === 'lists'  && <TodosPage  bgPhoto={bgPhoto || undefined} initialTab={listsInitialTab} initialTrainingEvent={initialTrainingEventId} />}
        {tab === 'inbox'  && <InboxPage  bgPhoto={bgPhoto || undefined} version={inboxVersion} />}
        {tab === 'log'    && <LogPage onDataSynced={bumpData} />}
      </div>

      <TabBar active={tab} dark={isDark} onChange={t => go(t)} />
      <FAB onClick={openCapture} />

      {capture && <CaptureSheet onClose={closeCapture} onSaved={() => setInboxVersion(v => v + 1)} />}
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
