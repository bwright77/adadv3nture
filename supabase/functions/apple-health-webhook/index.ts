import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const WEBHOOK_SECRET = Deno.env.get('HEALTH_WEBHOOK_SECRET')!
const WEBHOOK_USER_ID = Deno.env.get('HEALTH_WEBHOOK_USER_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:benw21@gmail.com'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

interface HealthPayload {
  secret: string
  date: string           // YYYY-MM-DD — the date the data represents (yesterday for sleep/HRV)
  rhr?: number | null
  hrv_ms?: number | null
  sleep_seconds?: number | null
  sleep_raw?: unknown    // raw Sleep samples from Shortcuts — logged to inspect structure
  steps?: number | null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: HealthPayload
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (payload.secret !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  console.log('payload:', JSON.stringify(payload))

  if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    return new Response('Invalid date — expected YYYY-MM-DD', { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const row: Record<string, unknown> = {
    user_id: WEBHOOK_USER_ID,
    signal_date: payload.date,
    source: 'apple_health',
  }

  // Only set fields that were actually provided — nulls mean watch wasn't worn, not zero
  if (payload.rhr != null)           row.rhr = Math.round(payload.rhr)
  if (payload.hrv_ms != null)        row.hrv_ms = Math.round(payload.hrv_ms * 10) / 10
  if (payload.sleep_seconds != null) row.sleep_duration_hours = Math.round((payload.sleep_seconds / 3600) * 10) / 10
  if (payload.steps != null)         row.steps_count = Math.round(payload.steps)

  // Log raw sleep data so we can inspect the structure and determine how to parse it
  if (payload.sleep_raw != null) console.log('sleep_raw:', JSON.stringify(payload.sleep_raw))

  const { error } = await supabase
    .from('recovery_signals')
    .upsert(row, { onConflict: 'user_id,signal_date' })

  if (error) {
    console.error('Upsert error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── Chain: kick off the morning briefing now that recovery data has
  // landed. Fire-and-forget — we don't want the webhook response to fail
  // (or wait on) the Anthropic round trip. Errors are logged but swallowed.
  triggerBriefing(supabase).catch(err => console.error('triggerBriefing failed:', err))

  return new Response(JSON.stringify({ ok: true, date: payload.date, fields: Object.keys(row) }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function triggerBriefing(supabase: any): Promise<void> {
  // Look up the user's last-known location so the briefing reflects where
  // they actually are (Denver vs Howard) rather than the Denver default.
  const { data: userRow } = await supabase
    .from('users')
    .select('last_known_location')
    .eq('id', WEBHOOK_USER_ID)
    .maybeSingle() as { data: { last_known_location: { lat: number; lon: number; name: string; elevation_ft: number | null } | null } | null }

  const body: Record<string, unknown> = { user_id: WEBHOOK_USER_ID }
  const loc = userRow?.last_known_location
  if (loc && typeof loc.lat === 'number' && typeof loc.lon === 'number') {
    body.location = {
      lat: loc.lat,
      lon: loc.lon,
      name: loc.name,
      elevation_ft: loc.elevation_ft,
    }
  }

  const url = `${SUPABASE_URL}/functions/v1/morning-briefing`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error('morning-briefing chain returned', res.status, await res.text())
    return
  }

  const data = await res.json() as { briefing?: string; thinking_prompt?: string | null }
  console.log('morning-briefing chain ok')

  // Push notification: turn the briefing's first sentence into a headline
  // and send to every subscription the user has registered.
  await sendPushToUser(supabase, WEBHOOK_USER_ID, headlineFromBriefing(data.briefing ?? ''))
}

function headlineFromBriefing(briefing: string): string {
  if (!briefing) return 'Your morning briefing is ready'
  // First sentence — handle ".!?" terminators, fall back to first 120 chars.
  const match = briefing.match(/^[^.!?]+[.!?]/)
  const first = (match ? match[0] : briefing).trim()
  return first.length > 140 ? first.slice(0, 137) + '…' : first
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendPushToUser(supabase: any, userId: string, body: string): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log('Skipping push: VAPID keys not configured')
    return
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId) as { data: { id: string; endpoint: string; p256dh: string; auth: string }[] | null }

  if (!subs || subs.length === 0) {
    console.log('No push subscriptions to notify')
    return
  }

  const payload = JSON.stringify({
    title: 'Morning briefing',
    body,
    url: '/',
  })

  // Send to each subscription independently. Stale subscriptions (410/404)
  // get cleaned up so the table doesn't accumulate dead endpoints.
  const results = await Promise.allSettled(subs.map(s =>
    webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      payload,
    ),
  ))

  await Promise.all(results.map(async (r, i) => {
    if (r.status === 'fulfilled') {
      await supabase.from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', subs[i].id)
      return
    }
    const err = r.reason as { statusCode?: number; message?: string }
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      console.log('Pruning stale push subscription', subs[i].endpoint)
      await supabase.from('push_subscriptions').delete().eq('id', subs[i].id)
    } else {
      console.error('Push send failed', subs[i].endpoint, err?.statusCode, err?.message)
    }
  }))
}
