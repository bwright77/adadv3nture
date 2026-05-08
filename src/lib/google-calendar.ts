import { supabase } from './supabase'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI as string

export function getGoogleAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state: userId,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

async function getValidToken(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('oauth_tokens')
    .select('access_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle() as unknown as { data: { access_token: string; expires_at: string } | null }

  if (!data) return null

  if (new Date(data.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
    const res = await fetch('/api/google/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) return null
    const refreshed = await res.json() as { access_token: string }
    return refreshed.access_token
  }

  return data.access_token
}

export interface CalendarEvent {
  id: string
  title: string
  start: string        // ISO or date string
  end: string
  allDay: boolean
  location?: string
}

export async function getTodayEvents(userId: string, offsetDays = 0): Promise<CalendarEvent[]> {
  const token = await getValidToken(userId)
  if (!token) return []

  const now = new Date()
  now.setDate(now.getDate() + offsetDays)
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '10',
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (!res.ok) return []

  const data = await res.json() as {
    items: {
      id: string
      summary?: string
      start: { dateTime?: string; date?: string }
      end: { dateTime?: string; date?: string }
      location?: string
    }[]
  }

  return (data.items ?? []).map(e => ({
    id: e.id,
    title: e.summary ?? '(no title)',
    start: e.start.dateTime ?? e.start.date ?? '',
    end: e.end.dateTime ?? e.end.date ?? '',
    allDay: !e.start.dateTime,
    location: e.location,
  }))
}

export async function isGoogleConnected(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('oauth_tokens')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle()
  return !!data
}
