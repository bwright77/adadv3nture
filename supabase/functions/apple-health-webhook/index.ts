import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('HEALTH_WEBHOOK_SECRET')!
const WEBHOOK_USER_ID = Deno.env.get('HEALTH_WEBHOOK_USER_ID')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface HealthPayload {
  secret: string
  date: string           // YYYY-MM-DD — the date the data represents (yesterday for sleep/HRV)
  rhr?: number | null
  hrv_ms?: number | null
  sleep_seconds?: number | null
  sleep_raw?: unknown    // raw Sleep samples from Shortcuts — logged to inspect structure
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
  if (payload.rhr != null)         row.rhr = Math.round(payload.rhr)
  if (payload.hrv_ms != null)      row.hrv_ms = Math.round(payload.hrv_ms * 10) / 10
  if (payload.sleep_seconds != null) row.sleep_duration_hours = Math.round((payload.sleep_seconds / 3600) * 10) / 10

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

  return new Response(JSON.stringify({ ok: true, date: payload.date, fields: Object.keys(row) }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
