import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── System prompt builders ─────────────────────────────────────────────────
//
// Personal narrative ("About …") is sourced from users.briefing_profile at
// request time so it stays editable without code changes. Static voice and
// output-format rules stay in code.

interface BriefingProfile {
  identity?: string
  current_focus?: string
  health_context?: string[]
  goals?: string[]
  tone_notes?: string[]
  weekend_identity?: string
}

function aboutLines(profile: BriefingProfile, weekend: boolean): string {
  const lines: string[] = []
  if (profile.identity) lines.push(profile.identity)
  if (!weekend && profile.current_focus) lines.push(profile.current_focus)
  for (const h of profile.health_context ?? []) lines.push(h)
  for (const g of profile.goals ?? []) lines.push(g)
  // Anchors and family ages flow in via the context block — not duplicated here.
  if (!weekend) {
    for (const t of profile.tone_notes ?? []) lines.push(t)
  } else if (profile.weekend_identity) {
    lines.push(profile.weekend_identity)
  }
  return lines.map(l => `- ${l}`).join('\n')
}

function buildWeekdaySystemPrompt(profile: BriefingProfile): string {
  return `You are Ben's personal daily briefing for adadv3nture.

About Ben:
${aboutLines(profile, false)}

Current family + anchors are in the context message — use the given dates and
days-until numbers verbatim. Do NOT compute or estimate dates yourself.

Portfolio categories (match the Lists tabs): CAREER (non-negotiable), FAMILY,
HOME, PROJECTS. Body / workout is tracked separately via the program tracker,
not the portfolio review. Pilot lights = days since each portfolio category
was last completed. When a category goes dark (3+ days), name it specifically
— not "you've been neglecting family" but "Chase and Ada haven't had
intentional time in 4 days."
MIT completion rate is the meta-metric — reference it when it's moving
meaningfully.

Tone: Direct. Warm. Specific. Never generic. Never wellness-app cheerful.
Reference real numbers. Flag uncertainty honestly. Max 150 words for the
briefing. Always end with ONE specific next action — not a category, an
actual step.

Also generate ONE thinking prompt — a specific unresolved question to chew
on during the 7:40am workout. Not motivational fluff. Something worth
actually thinking about: a decision pending, a pattern in the data, a
tension to resolve.

Respond ONLY with valid JSON (no markdown, no code blocks):
{"briefing": "...", "thinking_prompt": "..."}`
}

function buildWeekendSystemPrompt(profile: BriefingProfile): string {
  return `You are Ben's weekend mission briefing for adadv3nture.

About Ben:
${aboutLines(profile, true)}

Current family + anchors are in the context message — use the given dates and
days-until numbers verbatim. Do NOT compute or estimate dates yourself.

The organizing question is: "What's the move today?"
Recovery gates the objective size. Weather determines the location. Family is
the primary lens.

On weekends:
- Drop ALL career urgency. Zero. Weekends breathe.
- Drop MIT neglect-scoring. Weekend MITs are aspirational, not punitive.
- Lead with the body signal — recovery tier tells him how big to go.
- Weave in the weather — trail conditions, cold, heat, wind all matter.
- Kids are present. Name them specifically when relevant.
- If a plan is already set, affirm it and add any useful prep detail.
- If no plan, suggest the obvious best move given conditions + recovery.
- One specific action at the end: a time, a location, a first step.

Tone: The same direct, warm voice — but exhale. This is the weekend.
No urgency except "make it count." Max 150 words.

Also generate ONE thinking prompt — not strategy, not career. Something
worth turning over on a long climb or trail: a tension about how he spends
his time, what he's building, what matters to the kids, what kind of
dad/person/athlete he's becoming. Frame it as an open question, not a
problem to solve.

Respond ONLY with valid JSON (no markdown, no code blocks):
{"briefing": "...", "thinking_prompt": "..."}`
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function prevDate(dateStr: string, daysBack: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - daysBack)
  return d.toISOString().substring(0, 10)
}

function daysBetween(today: string, target: string): number {
  const t = new Date(today + 'T12:00:00')
  const e = new Date(target + 'T12:00:00')
  return Math.ceil((e.getTime() - t.getTime()) / 86_400_000)
}

function ageOnDate(birthday: string, today: string): number {
  const b = new Date(birthday + 'T12:00:00')
  const t = new Date(today + 'T12:00:00')
  let age = t.getFullYear() - b.getFullYear()
  const m = t.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--
  return age
}

interface AnchorRow { slug: string; title: string; event_date: string; location: string | null; notes: string | null }
interface FamilyRow { name: string; role: string; birthday: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadAnchorsAndFamily(admin: any, userId: string, today: string): Promise<{
  anchorBlock: string
  familyBlock: string
}> {
  const [anchorsRes, familyRes] = await Promise.all([
    admin.from('anchor_events')
      .select('slug, title, event_date, location, notes')
      .eq('user_id', userId),
    admin.from('family_members')
      .select('name, role, birthday')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
  ])

  const anchors = (anchorsRes.data ?? []) as AnchorRow[]
  const family = (familyRes.data ?? []) as FamilyRow[]

  const anchorLines = anchors.map(a => {
    const days = daysBetween(today, a.event_date)
    const parts = [
      `${a.title}`,
      `${a.event_date}`,
      `${days} days away`,
      a.location,
      a.notes,
    ].filter(Boolean)
    return `- ${parts.join(' · ')}`
  })
  const anchorBlock = anchorLines.length > 0
    ? `ANCHORS:\n${anchorLines.join('\n')}`
    : 'ANCHORS: none configured'

  const kids = family.filter(f => f.role === 'child')
    .map(k => `${k.name} (${ageOnDate(k.birthday, today)})`)
  const spouse = family.find(f => f.role === 'spouse')?.name
  const familyLines: string[] = []
  if (spouse) familyLines.push(`- Spouse: ${spouse}`)
  if (kids.length) familyLines.push(`- Kids: ${kids.join(', ')}`)
  const familyBlock = familyLines.length > 0
    ? `FAMILY:\n${familyLines.join('\n')}`
    : 'FAMILY: not configured'

  return { anchorBlock, familyBlock }
}

// Default to Denver when the client didn't (or couldn't) pass a location.
// Keeping a default avoids "no weather" briefings — the rest of the UI uses
// the same fallback in `src/lib/locations.ts` (DEFAULT_LOCATION).
const DEFAULT_BRIEFING_LOCATION = {
  lat: 39.7392, lon: -104.9903, name: 'Denver', elevation_ft: 5318,
}

interface BriefingLocation {
  lat: number
  lon: number
  name: string
  elevation_ft: number | null
}

async function fetchWeather(owmKey: string, lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${owmKey}&units=imperial`,
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

function locationStamp(loc: BriefingLocation): string {
  if (loc.elevation_ft != null) {
    return `${loc.name} ${loc.elevation_ft.toLocaleString()}ft`
  }
  return loc.name
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

    // Two auth paths:
    //   1. User JWT — the standard client-facing call
    //   2. Service role + body.user_id — used by server-to-server flows
    //      (e.g. apple-health-webhook chains briefing generation on wake-up
    //      after recovery_signals lands). The webhook has no JWT; it
    //      supplies SUPABASE_SERVICE_ROLE_KEY in the Authorization header
    //      and the target user_id in the body.
    const authHeader = req.headers.get('Authorization') ?? ''
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    // Parse body early so we can read user_id on the service-role path.
    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* no body */ }

    let userId: string
    if (bearer === serviceKey && typeof body.user_id === 'string') {
      userId = body.user_id
    } else {
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
      userId = user.id
    }

    // Synthesise the rest of the handler's expectations by exposing a
    // `user` shape with the id the downstream code already uses.
    const user = { id: userId }

    // Determine day_type — client can override, otherwise detect from server date
    const serverDow = new Date().getDay()
    const serverIsWeekend = serverDow === 0 || serverDow === 6
    const dayType: 'weekday' | 'weekend' =
      body.day_type === 'weekend' ? 'weekend'
      : body.day_type === 'weekday' ? 'weekday'
      : serverIsWeekend ? 'weekend' : 'weekday'

    // Optional client-supplied location. Validate the shape; otherwise default to Denver.
    const rawLoc = body.location as Partial<BriefingLocation> | undefined
    const location: BriefingLocation =
      rawLoc && typeof rawLoc.lat === 'number' && typeof rawLoc.lon === 'number' && typeof rawLoc.name === 'string'
        ? {
            lat: rawLoc.lat,
            lon: rawLoc.lon,
            name: rawLoc.name,
            elevation_ft: typeof rawLoc.elevation_ft === 'number' ? rawLoc.elevation_ft : null,
          }
        : DEFAULT_BRIEFING_LOCATION

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

    const [profileRes, anchorsAndFamily] = await Promise.all([
      admin.from('users')
        .select('briefing_profile')
        .eq('id', user.id)
        .maybeSingle(),
      loadAnchorsAndFamily(admin, user.id, today),
    ])
    const profile = ((profileRes.data as { briefing_profile: BriefingProfile } | null)?.briefing_profile) ?? {}
    const { anchorBlock, familyBlock } = anchorsAndFamily

    const systemPrompt = dayType === 'weekend'
      ? buildWeekendSystemPrompt(profile)
      : buildWeekdaySystemPrompt(profile)

    if (dayType === 'weekend') {
      // ── Weekend context ────────────────────────────────────────────────────
      const yesterday = prevDate(today, 1)

      const [recoveryRes, weightRes, lastEffortRes, weekendPlanRes, weatherStr] = await Promise.all([
        admin.from('recovery_signals')
          .select('rhr, sleep_duration_hours, drinks_consumed, recovery_score, recovery_tier, mood_score')
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
        owmKey ? fetchWeather(owmKey, location.lat, location.lon) : Promise.resolve(null),
      ])

      const signal = recoveryRes.data?.[0] as {
        rhr: number | null
        sleep_duration_hours: number | null
        drinks_consumed: number
        recovery_score: number | null
        recovery_tier: string | null
        mood_score: number | null
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

${familyBlock}

${anchorBlock}

WEATHER (${locationStamp(location)}):
${weatherStr ? `- ${weatherStr}` : '- No weather data'}

RECOVERY:
- Score: ${signal?.recovery_score != null ? Math.round(signal.recovery_score) : 'unknown'}/100${signal?.recovery_tier ? ` · ${signal.recovery_tier.toUpperCase()}` : ''}
- RHR: ${signal?.rhr ?? 'no data'} bpm (baseline 63)
- Sleep: ${signal?.sleep_duration_hours != null ? `${signal.sleep_duration_hours.toFixed(1)}h` : 'no data'}
- Drinks yesterday: ${yDrinks}
- Mood (1-5): ${signal?.mood_score ?? 'not logged'}

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
          .select('signal_date, rhr, sleep_duration_hours, drinks_consumed, recovery_score, recovery_tier, mood_score')
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
          .select('plan_date, family_creative_done, home_done, career_done, projects_done, family_creative_note, home_note, career_note, projects_note')
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
        mood_score: number | null
      } | undefined
      const ySignal = recoveryRes.data?.find((r: { signal_date: string }) => r.signal_date === yesterday) as {
        drinks_consumed: number
        mood_score: number | null
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
        career_done: boolean; projects_done: boolean
        family_creative_note: string | null; home_note: string | null
        career_note: string | null; projects_note: string | null
      }
      const reviewRows = (reviewRes.data ?? []) as ReviewRow[]
      const reviewCats = ['career', 'family_creative', 'home', 'projects'] as const
      // Labels mirror the Lists tabs (Career, Family, Home, Projects).
      const catLabels: Record<string, string> = {
        career: 'CAREER', family_creative: 'FAMILY', home: 'HOME', projects: 'PROJECTS',
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
LOCATION: ${locationStamp(location)}

${familyBlock}

${anchorBlock}

RECOVERY:
- RHR: ${todaySignal?.rhr ?? 'no data'} bpm (baseline 63)
- Sleep: ${todaySignal?.sleep_duration_hours != null ? `${todaySignal.sleep_duration_hours.toFixed(1)}h` : 'no data'}
- Drinks yesterday: ${ySignal?.drinks_consumed ?? 0}
- Mood yesterday (1-5): ${ySignal?.mood_score ?? 'not logged'}
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
