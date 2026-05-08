// Nightly Edge Function — pre-computes weekly_summaries for all active users.
// Triggered by Supabase cron (or a Vercel cron hitting this endpoint).
// Auth: Bearer CRON_SECRET header.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function toDateStr(d: Date): string {
  return d.toISOString().substring(0, 10)
}

function subDays(n: number, from = new Date()): Date {
  const d = new Date(from)
  d.setDate(d.getDate() - n)
  return d
}

function avg(nums: (number | null)[]): number | null {
  const valid = nums.filter((n): n is number => n != null)
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: users } = await admin.from('users').select('id')
  if (!users?.length) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const today = new Date()
  // Compute the Monday of the current week
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon...
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = subDays(daysToMonday, today)
  const weekStartStr = toDateStr(weekStart)
  const weekEndStr = toDateStr(today)

  let processed = 0

  for (const { id: userId } of users) {
    try {
      const [activitiesRes, metricsRes, recoveryRes] = await Promise.all([
        admin.from('activities')
          .select('activity_type, distance_miles, duration_seconds, avg_hr')
          .eq('user_id', userId)
          .gte('activity_date', weekStartStr)
          .lte('activity_date', weekEndStr),

        admin.from('body_metrics')
          .select('weight_lbs, body_fat_pct, muscle_mass_pct')
          .eq('user_id', userId)
          .gte('measured_at', weekStartStr),

        admin.from('recovery_signals')
          .select('rhr, sleep_score, drinks_consumed, recovery_score')
          .eq('user_id', userId)
          .gte('signal_date', weekStartStr)
          .lte('signal_date', weekEndStr),
      ])

      const acts = activitiesRes.data ?? []
      const metrics = metricsRes.data ?? []
      const recovery = recoveryRes.data ?? []

      const runs = acts.filter((a: { activity_type: string }) =>
        a.activity_type === 'run' || a.activity_type === 'trail_run'
      ) as { distance_miles: number | null; duration_seconds: number | null; avg_hr: number | null }[]

      const totalMilesRun = runs.reduce((s, r) => s + (r.distance_miles ?? 0), 0)
      const longestRun = runs.length > 0 ? Math.max(...runs.map(r => r.distance_miles ?? 0)) : null
      const totalDurationHours = acts.reduce(
        (s, a: { duration_seconds: number | null }) => s + (a.duration_seconds ?? 0), 0
      ) / 3600

      const summary = {
        user_id: userId,
        week_start: weekStartStr,
        avg_weight_lbs: avg(metrics.map((m: { weight_lbs: number | null }) => m.weight_lbs)),
        avg_body_fat_pct: avg(metrics.map((m: { body_fat_pct: number | null }) => m.body_fat_pct)),
        avg_muscle_mass_pct: avg(metrics.map((m: { muscle_mass_pct: number | null }) => m.muscle_mass_pct)),
        total_miles_run: totalMilesRun || null,
        total_workouts: acts.length || null,
        total_duration_hours: totalDurationHours || null,
        longest_run_miles: longestRun,
        avg_rhr: avg(recovery.map((r: { rhr: number | null }) => r.rhr)),
        avg_sleep_score: avg(recovery.map((r: { sleep_score: number | null }) => r.sleep_score)),
        avg_drinks_per_day: avg(recovery.map((r: { drinks_consumed: number }) => r.drinks_consumed)),
      }

      await admin.from('weekly_summaries').upsert(summary, { onConflict: 'user_id,week_start' })
      processed++
    } catch (err) {
      console.error(`weekly-summaries failed for user ${userId}:`, err)
    }
  }

  return new Response(JSON.stringify({ ok: true, processed, week_start: weekStartStr }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
