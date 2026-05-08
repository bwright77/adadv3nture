import { useState, useEffect } from 'react'
import { Glass } from '../../ui/Glass'
import { CardLabel } from '../../ui/CardLabel'
import { C } from '../../../tokens'
import { useAuth } from '../../../contexts/AuthContext'
import { getTodayEvents, isGoogleConnected, getGoogleAuthUrl, type CalendarEvent } from '../../../lib/google-calendar'

interface WCalendarProps { dark?: boolean; span?: number; tomorrow?: boolean }

function formatTime(iso: string): string {
  if (!iso.includes('T')) return 'all day'
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase().replace(' ', '')
}

export function WCalendar({ dark, span = 6, tomorrow = false }: WCalendarProps) {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user) return
    isGoogleConnected(user.id).then(async c => {
      setConnected(c)
      if (c) {
        const evts = await getTodayEvents(user.id, tomorrow ? 1 : 0)
        setEvents(evts)
      }
    }).catch(() => setConnected(false))
  }, [user, tomorrow])

  function handleConnect() {
    if (!user) return
    window.location.href = getGoogleAuthUrl(user.id)
  }

  if (connected === null) {
    return (
      <Glass dark={dark} span={span} pad={14}>
        <CardLabel dark={dark}>Calendar · {tomorrow ? 'tomorrow' : 'today'}</CardLabel>
        <div style={{ fontSize: 11, opacity: 0.4, marginTop: 8 }}>Loading…</div>
      </Glass>
    )
  }

  if (!connected) {
    return (
      <Glass dark={dark} span={span} pad={14}>
        <CardLabel dark={dark}>Calendar · {tomorrow ? 'tomorrow' : 'today'}</CardLabel>
        <button
          onClick={handleConnect}
          style={{
            marginTop: 10, padding: '8px 14px', borderRadius: 10,
            background: C.rust, color: C.cream, border: 'none',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Connect Google Calendar
        </button>
      </Glass>
    )
  }

  return (
    <Glass dark={dark} span={span} pad={14}>
      <CardLabel dark={dark}>Calendar · {tomorrow ? 'tomorrow' : 'today'}</CardLabel>
      {!events ? (
        <div style={{ fontSize: 11, opacity: 0.4, marginTop: 8 }}>Loading…</div>
      ) : events.length === 0 ? (
        <div style={{ fontSize: 11, opacity: 0.4, marginTop: 8 }}>Nothing on the calendar today.</div>
      ) : (
        events.map((e, i) => (
          <div key={e.id} style={{
            display: 'flex', gap: 10, padding: '5px 0',
            borderBottom: i < events.length - 1
              ? `0.5px dashed ${dark ? 'rgba(255,255,255,0.15)' : C.ink20}`
              : 'none',
            alignItems: 'baseline',
          }}>
            <span className="mono" style={{
              fontSize: 10, color: dark ? C.teal : C.rust,
              width: 38, flexShrink: 0,
            }}>
              {formatTime(e.start)}
            </span>
            <span style={{ fontSize: 11, lineHeight: 1.3 }}>{e.title}</span>
          </div>
        ))
      )}
    </Glass>
  )
}
