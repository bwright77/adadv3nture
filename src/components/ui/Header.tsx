import { useState, useEffect } from 'react'
import { C } from '../../tokens'

interface HeaderProps {
  greeting?: string   // override — if omitted, shows live time + date
  sub: string
  dark?: boolean
}

function useLiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

function formatGreeting(d: Date): string {
  const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  const date = d.getDate()
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const hour = h % 12 || 12
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${day} ${month} ${date} · ${hour}:${m} ${ampm}`
}

export function Header({ greeting, sub, dark = true }: HeaderProps) {
  const now = useLiveClock()
  const display = greeting ?? formatGreeting(now)

  return (
    <div style={{ padding: '10px 20px 14px', color: dark ? C.cream : C.dark }}>
      <div className="badge" style={{ fontSize: 11, letterSpacing: '0.2em', opacity: 0.65 }}>
        ADADV3NTURE
      </div>
      <div className="badge" style={{ fontSize: 26, lineHeight: 1.1, marginTop: 2 }}>
        {display}
      </div>
      <div className="mono" style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
        {sub}
      </div>
    </div>
  )
}
