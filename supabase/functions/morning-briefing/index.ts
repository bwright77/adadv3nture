import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Weekday system prompt ──────────────────────────────────────────────────

const WEEKDAY_SYSTEM_PROMPT = `You are Ben's personal daily briefing for adadv3nture.

About Ben:
- 48yo dad, Denver CO (5,318ft), kids: Chase (8.5), Ada (7), Sylvia (5)
- Building Wright Adventures — software for good, working for himself
- Labor Day 2026: WA income or get a real job. Fish or cut bait.
- GLP-1 since Nov 2024. Target 178-182 lbs (currently ~187)
- Drink ratio goal: ≤ 2/day average. Not a streak — a ratio.
- West Line Winder 30K Sept 26 — birthday weekend anchor event
- External accountability works better than abstract goals for Ben
- "Why bother" creeps in when progress stalls — counter with specific action

Portfolio categories: BODY (workout, non-negotiable), CAREER (WA block, non-negotiable),
FAMILY/CREATIVE, HOME, PERSONAL. Pilot lights = days since each was last completed.
When a category goes dark (3+ days), name it specifically — not "you've been neglecting family"
but "Chase and Ada haven't had intentional time in 4 days."
MIT completion rate is the meta-metric — reference it when it's moving meaningfully.

Tone: Direct. Warm. Specific. Never generic. Never wellness-app cheerful.
Reference real numbers. Flag uncertainty honestly. Max 150 words for the briefing.
Always end with ONE specific next action — not a category, an actual step.

Also generate ONE thinking prompt — a specific unresolved question to chew on
during the 7:40am workout. Not motivational fluff. Something worth actually thinking
about: a decision pending, a pattern in the data, a tension to resolve.

Respond ONLY with valid JSON (no markdown, no code blocks):
{"briefing": "...", "thinking_prompt": "..."}`

// ─── Weekend system prompt ──────────────────────────────────────────────────

const WEEKEND_SYSTEM_PROMPT = `You are Ben's weekend mission briefing for adadv3nture.

About Ben:
- 48yo dad, Denver CO (5,318ft), kids: Chase (8.5), Ada (7), Sylvia (5)
- GLP-1 since Nov 2024. Target 178-182 lbs (currently ~187)
- Drink ratio goal: ≤ 2/day average. Not a streak — a ratio.
- West Line Winder 30K Sept 26 — his birthday-weekend anchor race (Buena Vista)
- Big rides, long hikes, 14ers, ski tours — this is who he is when work falls away

The organizing question is: "What's the move today?"
Recovery gates the objective size. Weather determines the location. Family is the primary lens.

On weekends:
- Drop ALL career/WA/Labor Day urgency. Zero. Weekends breathe.
- Drop MIT neglect-scoring. Weekend MITs are aspirational, not punitive.
- Lead with the body signal — recovery tier tells him how big to go.
- Weave in the weather — trail conditions, cold, heat, wind all matter.
- Kids are present. Name them specifically when relevant (Chase, Ada, Sylvia).
- If a plan is already set, affirm it and add any useful prep detail.
- If no plan, suggest the obvious best move given conditions + recovery.
- One specific action at the end: a time, a location, a first step.

Tone: The same direct, warm voice — but exhale. This is the weekend. No urgency except "make it count."
Max 150 words.

Also generate ONE thinking prompt — not strategy, not career. Something worth turning over on a long climb or trail:
a tension about how he spends his time, what he's building, what matters to the kids, what kind of dad/person/athlete he's becoming.
Frame it as an open question, not a problem to solve.

Respond ONLY with valid JSON (no markdown, no code blocks):
{"briefing": "...", "thinking_prompt": "..."}`

// ─── Helpers ────────────────────────────────────────────────────────────────

function prevDate(dateStr: string, daysBack: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - daysBack)
  return d.toISOString().substring(0, 10)
}

async function fetchDenverWeather(owmKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=39.7392&lon=-104.9903&appid=${owmKey}&units=imperial`,
    )
    if (!res.ok) return null
    const d = await res.json() as {
      main: { temp: number; temp_max: number; temp_min: number }
      weather: { description: string }[]
      wind: { speed: number }
    }
    const desc = d.weather?.[0]?.description ?? 'unknown'
    return `${Math.round(d.main.temp)}°F, ${desc}, high ${Math.round(d.main.temp_max)}°F / low ${Math.round(d.main.temp_min)}°F, wind ${Math.round(d.wind.speed)} mph`
  } catch {
    return null
  }
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!
    const owmKey = Deno.env.get('OPENWEATHER_API_KEY') ?? ''

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

    // Determine day_type — client can override, otherwise detect from server date
    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* no body */ }
    const serverDow = new Date().getDay()
    const serverIsWeekend = serverDow === 0 || serverDow === 6
    const dayType: 'weekday' | 'weekend' =
      body.day_type === 'weekend' ? 'weekend'
      : body.day_type === 'weekday' ? 'weekday'
      : serverIsWeekend ? 'weekend' : 'weekday'

    const admin = createClient(supabaseUrl, serviceKey)
    const today = new Date().toISOString().substring(0, 10)

    // Return cached briefing if already generated today
    const { data: existing } = await admin
      .from('daily_plans')
      .select('morning_briefing, thinking_prompt, weekend_briefing, weekend_thinking_prompt')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .maybeSingle()

    if (dayType === 'weekend' && existing?.weekend_briefing) {
      return new Response(
        JSON.stringify({
          briefing: existing.weekend_briefing,
          thinking_prompt: existing.weekend_thinking_prompt,
          cached: true,
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }
    if (dayType === 'weekday' && existing?.morning_briefing) {
      return new Response(
        JSON.stringify({
          briefing: existing.morning_briefing,
          thinking_prompt: existing.thinking_prompt,
          cached: true,
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    let contextMsg: string
    const systemPrompt = dayType === 'weekend' ? WEEKEND_SYSTEM_PROMPT : WEEKDAY_SYSTEM_PROMPT

    if (dayType === 'weekend') {
      // ── Weekend context ────────────────────────────────────────────────────
      const yesterday = prevDate(today, 1)

      const [recoveryRes, weightRes, lastEffortRes, weekendPlanRes, weatherStr] = await Promise.all([
        admin.from('recovery_signals')
          .select('rhr, sleep_duration_hours, drinks_consumed, recovery_score, recovery_tier')
          .eq('user_id', user.id)
          .in('signal_date', [today, yesterday])
          .order('signal_date', { ascending: false })
          .limit(2),
        admin.from('body_metrics')
          .select('weight_lbs, measured_at')
          .eq('user_id', user.id)
          .order('measured_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin.from('activities')
          .select('activity_type, title, distance_miles, activity_date')
          .eq('user_id', user.id)
          .in('activity_type', ['run', 'ride', 'hike', 'ski', 'walk'])
          .gte('distance_miles', 3)
          .order('activity_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin.from('weekend_plans')
          .select('activity_type, title, location, departure_time, notes')
          .eq('user_id', user.id)
          .eq('plan_date', today)
          .maybeSingle(),
        owmKey ? fetchDenverWeather(owmKey) : Promise.resolve(null),
      ])

      const signal = recoveryRes.data?.[0] as {
        rhr: number | null
        sleep_duration_hours: number | null
        drinks_consumed: number
        recovery_score: number | null
        recovery_tier: string | null
      } | undefined
      const yDrinks = (recoveryRes.data?.[1] as { drinks_consumed: number } | undefined)?.drinks_consumed ?? 0

      const weight = (weightRes.data as { weight_lbs: number | null } | null)?.weight_lbs

      const effort = lastEffortRes.data as {
        activity_type: string; title: string | null
        distance_miles: number | null; activity_date: string
      } | null
      const daysAgoEffort = effort
        ? Math.floor((Date.now() - new Date(effort.activity_date).getTime()) / 86_400_000)
        : null

      const plan = weekendPlanRes.data as {
        activity_type: string | null; title: string | null
        location: string | null; departure_time: string | null; notes: string | null
      } | null

      const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

      contextMsg = `Today is ${dayName}, ${today}. It's a weekend.

WEATHER (Denver 5,318ft):
${weatherStr ? `- ${weatherStr}` : '- No weather data'}

RECOVERY:
- Score: ${signal?.recovery_score != null ? Math.round(signal.recovery_score) : 'unknown'}/100${signal?.recovery_tier ? ` · ${signal.recovery_tier.toUpperCase()}` : ''}
- RHR: ${signal?.rhr ?? 'no data'} bpm (baseline 63)
- Sleep: ${signal?.sleep_duration_hours != null ? `${signal.sleep_duration_hours.toFixed(1)}h` : 'no data'}
- Drinks yesterday: ${yDrinks}

LAST BIG EFFORT:${effort
  ? `
- ${effort.activity_type} · ${effort.distance_miles != null ? `${effort.distance_miles.toFixed(1)}mi` : ''}${effort.title ? ` · "${effort.title}"` : ''} · ${daysAgoEffort === 0 ? 'today' : daysAgoEffort === 1 ? 'yesterday' : `${daysAgoEffort} days ago`}`
  : '\n- No recent activities'}

TODAY'S PLAN:${plan?.title
  ? `
- ${plan.activity_type ?? 'activity'} · ${plan.title}${plan.location ? ` · ${plan.location}` : ''}${plan.departure_time ? ` · leave ${plan.departure_time}` : ''}${plan.notes ? `\n- Notes: ${plan.notes}` : ''}`
  : '\n- No plan set yet'}

WEIGHT: ${weight != null ? `${weight} lbs` : 'no recent data'} (target 178, GLP-1 trend)`

    } else {
      // ── Weekday context (unchanged) ────────────────────────────────────────
      const yesterday = prevDate(today, 1)
      const [recoveryRes, programRes, inboxRes, weightRes, reviewRes] = await Promise.all([
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
        admin.from('daily_plans')
          .select('plan_date, family_creative_done, home_done, financial_done, personal_done, family_creative_note, home_note, financial_note, personal_note')
          .eq('user_id', user.id)
          .lt('plan_date', today)
          .order('plan_date', { ascending: false })
          .limit(14),
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
        program_name: string; current_week: number; current_day: number
        total_weeks: number | null; next_workout_title: string | null; last_completed_date: string | null
      } | null
      const inboxCount = inboxRes.count ?? 0
      const weight = (weightRes.data as { weight_lbs: number | null } | null)?.weight_lbs

      type ReviewRow = {
        plan_date: string
        family_creative_done: boolean; home_done: boolean
        financial_done: boolean; personal_done: boolean
        family_creative_note: string | null; home_note: string | null
        financial_note: string | null; personal_note: string | null
      }
      const reviewRows = (reviewRes.data ?? []) as ReviewRow[]
      const reviewCats = ['family_creative', 'home', 'financial', 'personal'] as const
      const catLabels: Record<string, string> = {
        family_creative: 'FAMILY/CREATIVE', home: 'HOME', financial: 'CAREER/FINANCIAL', personal: 'PERSONAL',
      }
      const pilotLights: Record<string, number> = {}
      for (const cat of reviewCats) {
        let days = 0
        for (const row of reviewRows) {
          if (row[`${cat}_done` as keyof ReviewRow]) break
          days++
        }
        pilotLights[cat] = days
      }
      const yReview = reviewRows[0]
      const yesterdayReviewLines = yReview
        ? reviewCats.map(cat => {
            const done = yReview[`${cat}_done` as keyof ReviewRow]
            const note = yReview[`${cat}_note` as keyof ReviewRow] as string | null
            return `  ${catLabels[cat]}: ${done ? `✓${note ? ` (${note})` : ''}` : '—'}`
          }).join('\n')
        : '  No review data for yesterday'
      const pilotLightLines = reviewCats
        .map(cat => `  ${catLabels[cat]}: ${pilotLights[cat] === 0 ? 'done yesterday' : `${pilotLights[cat]}d since last done`}`)
        .join('\n')
      const last7 = reviewRows.slice(0, 7)
      let reviewTotal = 0, reviewDone = 0
      for (const row of last7) {
        for (const cat of reviewCats) {
          reviewTotal++
          if (row[`${cat}_done` as keyof ReviewRow]) reviewDone++
        }
      }
      const completionRate = reviewTotal > 0 ? Math.round((reviewDone / reviewTotal) * 100) : null
      const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

      contextMsg = `Today is ${dayName}, ${today}.

RECOVERY:
- RHR: ${todaySignal?.rhr ?? 'no data'} bpm (baseline 63)
- Sleep: ${todaySignal?.sleep_duration_hours != null ? `${todaySignal.sleep_duration_hours.toFixed(1)}h` : 'no data'}
- Drinks yesterday: ${ySignal?.drinks_consumed ?? 0}
- Recovery score: ${todaySignal?.recovery_score != null ? Math.round(todaySignal.recovery_score) : 'unknown'}/100${todaySignal?.recovery_tier ? ` · ${todaySignal.recovery_tier}` : ''}

WORKOUT:
- Prescribed: ${program?.next_workout_title ?? 'Total Strength (check program)'}
- Progress: W${program?.current_week ?? 1} of ${program?.total_weeks ?? 4} (${(program?.current_week ?? 1) - 1} weeks complete)

INBOX: ${inboxCount} unprocessed items
WEIGHT: ${weight != null ? `${weight} lbs` : 'no recent data'} (target 178)

YESTERDAY'S PORTFOLIO REVIEW:
${yesterdayReviewLines}

PILOT LIGHTS (days since each category last completed):
${pilotLightLines}
${completionRate !== null ? `7-day MIT completion rate: ${completionRate}%` : ''}`
    }

    // ── Call Anthropic ───────────────────────────────────────────────────────
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
        system: systemPrompt,
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

    const anthropicData = await anthropicRes.json() as { content: { text: string }[] }
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

    // ── Cache ────────────────────────────────────────────────────────────────
    const upsertFields = dayType === 'weekend'
      ? {
          user_id: user.id,
          plan_date: today,
          weekend_briefing: briefing,
          weekend_thinking_prompt: thinkingPrompt,
          weekend_briefing_generated_at: new Date().toISOString(),
        }
      : {
          user_id: user.id,
          plan_date: today,
          morning_briefing: briefing,
          thinking_prompt: thinkingPrompt,
          briefing_generated_at: new Date().toISOString(),
        }

    await admin.from('daily_plans').upsert(upsertFields, { onConflict: 'user_id,plan_date' })

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
