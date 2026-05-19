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
  // Defense-in-depth: ship the last N days of step counts each morning so a
  // missed Shortcut firing on any individual day gets backfilled by the next
  // run. Each entry upserts steps_count on its signal_date without touching
  // other fields on the row.
  steps_history?: { date: string; steps: number }[]
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
  if (payload.steps != null)         row.steps_count = Math.round(payload.steps)

  // Sleep clamp: anything over 12h is almost certainly the Shortcut's
  // category filter double-counting overlapping samples (parent + stages,
  // or naps stacked on the main session). Store null and log so the
  // briefing reads "Sleep: no data" instead of a fictional 13h.
  if (payload.sleep_seconds != null) {
    const hours = payload.sleep_seconds / 3600
    if (hours > 12) {
      console.warn(`Sleep clamp: ${hours.toFixed(2)}h exceeds 12h ceiling — storing null. payload.date=${payload.date}`)
      row.sleep_duration_hours = null
    } else if (hours < 0.5) {
      // Sub-30-minute "sleep" likely means the Shortcut filtered to a
      // value that doesn't exist this night (e.g., Source filter
      // missing the watch's actual source name). Treat as no data.
      console.warn(`Sleep floor: ${hours.toFixed(2)}h below 30min — storing null. payload.date=${payload.date}`)
      row.sleep_duration_hours = null
    } else {
      row.sleep_duration_hours = Math.round(hours * 10) / 10
    }
  }

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

  // Backfill historical step counts. Each entry upserts only the steps_count
  // column for its date, leaving rhr/sleep/etc. on existing rows untouched.
  let historyApplied = 0
  if (Array.isArray(payload.steps_history) && payload.steps_history.length > 0) {
    const rows = payload.steps_history
      .filter(h => h && typeof h.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h.date) && typeof h.steps === 'number')
      .map(h => ({
        user_id: WEBHOOK_USER_ID,
        signal_date: h.date,
        source: 'apple_health',
        steps_count: Math.round(h.steps),
      }))
    if (rows.length > 0) {
      const { error: histErr } = await supabase
        .from('recovery_signals')
        .upsert(rows, { onConflict: 'user_id,signal_date' })
      if (histErr) {
        console.error('steps_history upsert error:', histErr.message)
      } else {
        historyApplied = rows.length
      }
    }
  }

  // ── Chain: pull fresh Strava activities + Withings body metrics so the
  // briefing reads against real state instead of yesterday's stale snapshot,
  // then trigger the briefing. Whole chain is fire-and-forget — the webhook
  // returns 200 immediately and the Anthropic round trip runs in background.
  ;(async () => {
    await Promise.allSettled([
      syncStravaActivities(supabase),
      syncWithingsMetrics(supabase),
    ])
    await triggerBriefing(supabase)
  })().catch(err => console.error('morning chain failed:', err))

  return new Response(JSON.stringify({
    ok: true,
    date: payload.date,
    fields: Object.keys(row),
    steps_history_applied: historyApplied,
  }), {
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

  // force_regenerate so that a briefing generated earlier today (before
  // this wake-up sync) gets overwritten with one that sees the just-
  // landed RHR / sleep / drinks / mood data.
  const body: Record<string, unknown> = {
    user_id: WEBHOOK_USER_ID,
    force_regenerate: true,
  }
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


// ─── External-provider sync helpers ──────────────────────────────────────
// Both run as part of the morning chain so the briefing reads fresh state.
// Each is best-effort: errors are logged and the chain continues. Token
// refresh is delegated to the existing Vercel routes (which have the
// client_id/secret env vars) so this function doesnt need new secrets.

const VERCEL_BASE = "https://adadv3ntures.vercel.app"

async function getProviderAccessToken(provider: "strava" | "withings"): Promise<string | null> {
  try {
    const res = await fetch(`${VERCEL_BASE}/api/${provider}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: WEBHOOK_USER_ID }),
    })
    if (!res.ok) {
      console.warn(`${provider} refresh returned ${res.status}`)
      return null
    }
    const json = await res.json() as { access_token?: string }
    return json.access_token ?? null
  } catch (err) {
    console.error(`${provider} refresh failed:`, err)
    return null
  }
}

interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type?: string
  start_date: string
  start_date_local?: string
  elapsed_time: number
  distance?: number
  total_elevation_gain?: number
  average_heartrate?: number
  max_heartrate?: number
  average_speed?: number
  average_watts?: number
  kilojoules?: number
  calories?: number
}

function stravaTypeToLocal(type: string): string {
  const map: Record<string, string> = {
    Run: "run", TrailRun: "run",
    Ride: "ride", VirtualRide: "ride", GravelRide: "ride",
    WeightTraining: "strength", Workout: "workout",
    Hike: "hike", Walk: "walk",
    Swim: "swim", Yoga: "yoga",
  }
  return map[type] ?? type.toLowerCase()
}

const metersToMiles = (m: number) => Math.round((m / 1609.34) * 100) / 100
const metersToFeet  = (m: number) => Math.round(m * 3.28084)
const mpsToSecPerMi = (mps: number) => mps > 0 ? Math.round(1609.34 / mps) : 0

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncStravaActivities(supabase: any): Promise<void> {
  try {
    const token = await getProviderAccessToken("strava")
    if (!token) return

    // 7-day window is enough for a daily sync; first-time backfill stays
    // on the client (90 days via syncActivities in src/lib/strava.ts).
    const after = Math.floor((Date.now() - 7 * 86400 * 1000) / 1000)
    const stravaRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!stravaRes.ok) {
      console.warn(`Strava /activities returned ${stravaRes.status}`)
      return
    }
    const activities = await stravaRes.json() as StravaActivity[]
    if (!activities.length) {
      console.log("Strava sync: 0 activities returned")
      return
    }

    // Dedupe by strava_id — anything we already have is skipped. Bridge-
    // duplicate dedupe (fingerprint) stays client-side for now.
    const ids = activities.map(a => a.id)
    const { data: existing } = await supabase
      .from("activities")
      .select("strava_id")
      .eq("user_id", WEBHOOK_USER_ID)
      .in("strava_id", ids) as { data: { strava_id: number | null }[] | null }
    const existingIds = new Set((existing ?? [])
      .map(r => r.strava_id)
      .filter((id): id is number => id !== null))

    const rows = activities
      .filter(a => !existingIds.has(a.id))
      .map(a => ({
        user_id: WEBHOOK_USER_ID,
        source: "strava",
        strava_id: a.id,
        activity_type: stravaTypeToLocal(a.sport_type ?? a.type),
        title: a.name,
        // Pin activity_date to start_date_local so the workout groups under
        // the day Ben actually did it, even when start_date (UTC) crosses
        // the Denver day boundary.
        activity_date: (a.start_date_local ?? a.start_date).substring(0, 10),
        start_time: a.start_date,
        duration_seconds: a.elapsed_time,
        distance_miles: a.distance ? metersToMiles(a.distance) : null,
        elevation_feet: a.total_elevation_gain ? metersToFeet(a.total_elevation_gain) : null,
        avg_hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
        max_hr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
        avg_pace_seconds_per_mile: a.average_speed ? mpsToSecPerMi(a.average_speed) : null,
        avg_watts: a.average_watts ? Math.round(a.average_watts) : null,
        total_output_kj: a.kilojoules ?? null,
        calories: a.calories ? Math.round(a.calories) : null,
      }))

    if (!rows.length) {
      console.log("Strava sync: no new activities")
      return
    }
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from("activities").insert(rows.slice(i, i + 100))
      if (error) console.error("Strava insert error:", error.message)
    }
    console.log(`Strava sync: ${rows.length} new activities`)
  } catch (err) {
    console.error("Strava sync failed:", err)
  }
}

interface WithingsMeasure { value: number; type: number; unit: number }
interface WithingsMeasureGroup { date: number; measures: WithingsMeasure[] }

const valOf = (measures: WithingsMeasure[], type: number) => {
  const m = measures.find(x => x.type === type)
  return m ? m.value * Math.pow(10, m.unit) : null
}
const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncWithingsMetrics(supabase: any): Promise<void> {
  try {
    const token = await getProviderAccessToken("withings")
    if (!token) return

    const startdate = Math.floor((Date.now() - 30 * 86400 * 1000) / 1000)
    const wRes = await fetch("https://wbsapi.withings.net/measure", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "getmeas",
        meastype: "1,5,6,8,76,77,88,91,155,170,226",
        category: "1",
        startdate: String(startdate),
      }),
    })
    if (!wRes.ok) {
      console.warn(`Withings /measure returned ${wRes.status}`)
      return
    }
    const json = await wRes.json() as { status: number; body?: { measuregrps: WithingsMeasureGroup[] } }
    if (json.status !== 0) {
      console.warn(`Withings /measure status=${json.status}`)
      return
    }

    const groups = json.body?.measuregrps ?? []
    if (!groups.length) {
      console.log("Withings sync: 0 measuregroups")
      return
    }

    // Group by date — Withings splits one weigh-in across multiple groups.
    const byDate = new Map<number, WithingsMeasure[]>()
    for (const g of groups) {
      byDate.set(g.date, (byDate.get(g.date) ?? []).concat(g.measures))
    }

    const rows = []
    for (const [date, measures] of byDate) {
      const weightKg = valOf(measures, 1)
      const muscleKg = valOf(measures, 76)
      const boneKg   = valOf(measures, 88)
      const visceralFat = valOf(measures, 170)
      const vascularAge = valOf(measures, 155)
      const pwv = valOf(measures, 91)
      const bmr = valOf(measures, 226)
      rows.push({
        user_id: WEBHOOK_USER_ID,
        measured_at: new Date(date * 1000).toISOString(),
        source: "withings",
        weight_lbs: weightKg !== null ? kgToLbs(weightKg) : null,
        body_fat_pct: valOf(measures, 6),
        muscle_mass_lbs: muscleKg !== null ? kgToLbs(muscleKg) : null,
        muscle_mass_pct: muscleKg !== null && weightKg ? Math.round((muscleKg / weightKg) * 1000) / 10 : null,
        bone_mass_lbs: boneKg !== null ? kgToLbs(boneKg) : null,
        water_pct: valOf(measures, 77),
        visceral_fat: visceralFat !== null ? Math.round(visceralFat * 10) / 10 : null,
        vascular_age: vascularAge !== null ? Math.round(vascularAge) : null,
        pulse_wave_velocity: pwv !== null ? Math.round(pwv * 100) / 100 : null,
        bmr: bmr !== null ? Math.round(bmr) : null,
      })
    }

    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase
        .from("body_metrics")
        .upsert(rows.slice(i, i + 100), {
          onConflict: "user_id,measured_at,source",
          ignoreDuplicates: true,
        })
      if (error) console.error("Withings upsert error:", error.message)
    }
    console.log(`Withings sync: ${rows.length} candidate rows`)
  } catch (err) {
    console.error("Withings sync failed:", err)
  }
}
