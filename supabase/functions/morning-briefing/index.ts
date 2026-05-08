import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are Ben's personal daily briefing for adadv3nture.

About Ben:
- 48yo dad, Denver CO (5,318ft), kids: Chase (8.5), Ada (7), Sylvia (5)
- Building Wright Adventures — software for good, working for himself
- Labor Day 2026: WA income or get a real job. Fish or cut bait.
- GLP-1 since Nov 2024. Target 178-182 lbs (currently ~187)
- Drink ratio goal: ≤ 2/day average. Not a streak — a ratio.
- West Line Winder 30K Sept 26 — birthday weekend anchor event
- External accountability works better than abstract goals for Ben
- "Why bother" creeps in when progress stalls — counter with specific action

Tone: Direct. Warm. Specific. Never generic. Never wellness-app cheerful.
Reference real numbers. Flag uncertainty honestly. Max 150 words for the briefing.
Always end with ONE specific next action — not a category, an actual step.

Also generate ONE thinking prompt — a specific unresolved question to chew on
during the 7:40am workout. Not motivational fluff. Something worth actually thinking
about: a decision pending, a pattern in the data, a tension to resolve.

Respond ONLY with valid JSON (no markdown, no code blocks):
{"briefing": "...", "thinking_prompt": "..."}`

function prevDate(dateStr: string, daysBack: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - daysBack)
  return d.toISOString().substring(0, 10)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    // Verify user from JWT
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const today = new Date().toISOString().substring(0, 10)

    // Return cached briefing if already generated today
    const { data: existing } = await admin
      .from('daily_plans')
      .select('morning_briefing, thinking_prompt')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .maybeSingle()

    if (existing?.morning_briefing) {
      return new Response(
        JSON.stringify({ briefing: existing.morning_briefing, thinking_prompt: existing.thinking_prompt, cached: true }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // Gather context in parallel
    const yesterday = prevDate(today, 1)
    const [recoveryRes, programRes, inboxRes, weightRes] = await Promise.all([
      admin.from('recovery_signals')
        .select('signal_date, rhr, sleep_duration_hours, drinks_consumed, recovery_score, recovery_tier')
        .eq('user_id', user.id)
        .in('signal_date', [today, yesterday])
        .order('signal_date', { ascending: false }),
      admin.from('program_tracker')
        .select('program_name, current_week, current_day, total_weeks, next_workout_title, last_completed_date')
        .eq('user_id', user.id)
        .eq('active', true)
        .limit(1)
        .maybeSingle(),
      admin.from('inbox_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('processed', false),
      admin.from('body_metrics')
        .select('weight_lbs, measured_at')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const todaySignal = recoveryRes.data?.find((r: { signal_date: string }) => r.signal_date === today) as {
      rhr: number | null
      sleep_duration_hours: number | null
      drinks_consumed: number
      recovery_score: number | null
      recovery_tier: string | null
    } | undefined

    const ySignal = recoveryRes.data?.find((r: { signal_date: string }) => r.signal_date === yesterday) as {
      drinks_consumed: number
    } | undefined

    const program = programRes.data as {
      program_name: string
      current_week: number
      current_day: number
      total_weeks: number | null
      next_workout_title: string | null
      last_completed_date: string | null
    } | null

    const inboxCount = inboxRes.count ?? 0
    const weight = (weightRes.data as { weight_lbs: number | null } | null)?.weight_lbs

    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

    const contextMsg = `Today is ${dayName}, ${today}.

RECOVERY:
- RHR: ${todaySignal?.rhr ?? 'no data'} bpm (baseline 63)
- Sleep: ${todaySignal?.sleep_duration_hours != null ? `${todaySignal.sleep_duration_hours.toFixed(1)}h` : 'no data'}
- Drinks yesterday: ${ySignal?.drinks_consumed ?? 0}
- Recovery score: ${todaySignal?.recovery_score != null ? Math.round(todaySignal.recovery_score) : 'unknown'}/100${todaySignal?.recovery_tier ? ` · ${todaySignal.recovery_tier}` : ''}

WORKOUT:
- Prescribed: ${program?.next_workout_title ?? 'Total Strength (check program)'}
- Progress: W${program?.current_week ?? 1} of ${program?.total_weeks ?? 4} (${(program?.current_week ?? 1) - 1} weeks complete)

INBOX: ${inboxCount} unprocessed items
WEIGHT: ${weight != null ? `${weight} lbs` : 'no recent data'} (target 178)`

    // Call Anthropic
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: contextMsg }],
      }),
    })

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', await anthropicRes.text())
      return new Response(JSON.stringify({ error: 'Briefing generation failed' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const anthropicData = await anthropicRes.json() as {
      content: { text: string }[]
    }
    const rawText = anthropicData.content?.[0]?.text ?? '{}'

    let parsed: { briefing?: string; thinking_prompt?: string } = {}
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch?.[0] ?? rawText)
    } catch {
      console.error('Failed to parse Anthropic JSON:', rawText)
      parsed = { briefing: rawText }
    }

    const briefing = parsed.briefing ?? rawText
    const thinkingPrompt = parsed.thinking_prompt ?? null

    // Cache in daily_plans
    await admin.from('daily_plans').upsert(
      {
        user_id: user.id,
        plan_date: today,
        morning_briefing: briefing,
        thinking_prompt: thinkingPrompt,
        briefing_generated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,plan_date' },
    )

    return new Response(
      JSON.stringify({ briefing, thinking_prompt: thinkingPrompt }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('morning-briefing error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
