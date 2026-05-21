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
  // Per-category cadence in days — drives the cadence-aware MIT signal in
  // the context block. Missing keys fall back to DEFAULT_CADENCE below.
  category_cadence_days?: Partial<Record<'career' | 'family_creative' | 'home' | 'projects', number>>
}

const DEFAULT_CADENCE: Record<'career' | 'family_creative' | 'home' | 'projects', number> = {
  career: 3,
  family_creative: 2,
  home: 5,
  projects: 5,
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

ANCHORS ARE DOMAIN-TAGGED. Each anchor in the context starts with [CAREER]
or [TRAINING]. These domains MUST stay separate:
- [CAREER] anchor (Wright Adventures = the company / income milestone): work
  deadlines. Pair only with CAREER MIT progress, job-target activity, or
  Wright Adventures opportunity work.
- [TRAINING] anchor (West Line Winder 30K, plus FOCO/Hurricane/Bergen via
  training_goals): race events. Pair only with workout/recovery/long-run
  context — never with career, never with weight.
NEVER mix domains. Don't say "X lbs from target with N days to Wright
Adventures" — weight is not tied to Wright Adventures. Don't say "open the
Projects list for a Wright Adventures task" — Wright Adventures is CAREER,
not the personal-projects MIT slot.

WEIGHT IS OBSERVATIONAL, NOT A GOAL. Ben tracks weight (GLP-1 since Nov 2024)
but does not chase a number. The body goal is training-driven: the West Line
Winder 30K on Sept 26 and the 19-week training program. When you reference
body status, frame it through training readiness — RHR vs baseline (63),
recovery score, sleep, weekly training volume vs plan — not weight progress.
Do NOT say "X lbs from goal," "X lbs to target," or imply weight loss is the
objective. Weight is logged 2–3× per week; quote whatever's there as data.

TRAINING WEEK is the structured WLW prep context for the current Monday.
When present, it states which week of 19, the phase (BASE/BUILD/PEAK/TAPER),
this week's focus, run / long run / bike / strength volume targets, plus
two prescription strings:
- Quality: the week's intensity menu (e.g. "PZ Max 1× · Strides 2×").
  PZ Max = Power Zone Max on the Peloton, the primary midweek quality slot.
  Strides, cruise miles, tempo, fartlek, progression are running quality
  options.
- Strength block: which lifting program is active (e.g. "3× TS" = three
  Total Strength sessions; "RK" = Rebecca Kennedy 5-day split; "maint" =
  maintenance loading). This is separate from the standalone WORKOUT
  block, which names the specific next strength session in the program.
When you suggest a body / workout action, name it from the plan — "PZ Max
on the Peloton this morning," "long run is 14mi with descents" — instead
of inventing one or relying solely on the standalone workout prescription.

Portfolio categories (match the Lists tabs): CAREER (non-negotiable, this is
where Wright Adventures opportunities live), FAMILY, HOME, PROJECTS (personal
art/software/other — NOT Wright Adventures). Body / workout is tracked
separately via the program tracker, not the portfolio review. Pilot lights =
days since each portfolio category was last completed. When a category goes
dark (3+ days), name it specifically — not "you've been neglecting family"
but "Chase and Ada haven't had intentional time in 4 days."

CAREER IS WEEKDAY-ONLY. Weekends breathe — Saturday and Sunday with empty
Career is the design, not neglect. Career's pilot light counts weekday
gaps only; never flag Career as dark on Monday because of the weekend.

MIT CADENCE IS THE SIGNAL — NOT A COMPLETION %. Each category has its own
expected interval (career midweek, family every other day, home/projects
weekend-weighted). The MIT CADENCE context block tags each as LIT (within
interval) or DARK (past it). Goal is FORWARD MOTION, not uniform daily
quota.
- When a category is DARK, name it specifically with the actual days
  since last touched ("Projects 7d since last · cadence 5d · DARK —
  past your usual rhythm").
- When LIT, affirm the cadence briefly when it's working ("Career hit
  3 of the last 4 weekdays · good rhythm"). Don't belabor.
- NEVER aggregate into a single "X% MIT completion" or "X of 4 done"
  framing. That implicitly demands daily progress in every area at once,
  which is the wrong shape.
- Calibrate to Ben's actual rhythm: weekend-weighted categories on
  Tuesday afternoon aren't dark just because the count crept up.

Weight is logged 2-3× per week, not daily. The WEIGHT line labels how recent
the reading is — quote whatever's there. Never characterize a few-day-old
weigh-in as "no weight data" or "missing data"; that field is only empty if
Ben has literally never weighed in.

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

TRAINING WEEK context (when present) names this week's long-run target
(distance + vert) and any key marker like Bergen simulator or race week.
On weekends the long run is THE workout — anchor the briefing to the
prescribed long run when conditions allow, or flag a deferral when they
don't. Don't invent a different distance.

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

// Domain tag for each anchor so the prompt sees [CAREER] vs [TRAINING] and the
// model stops mashing weight metrics with career deadlines.
const ANCHOR_DOMAIN: Record<string, string> = {
  labor_day: 'CAREER',
  wlw: 'TRAINING',
}

// Mirrored from src/lib/program-tracker.ts so the briefing can self-correct
// the program position from completed Strava activities, instead of waiting
// for the client to open the Training tab and run syncProgramFromStrava.
const PROGRAM_SCHEDULES: Record<string, {
  workoutsPerWeek: number[]
  dayLabels: Record<number, Record<number, string>>
}> = {
  'Total Strength': {
    workoutsPerWeek: [3, 3, 4, 4],
    dayLabels: {
      1: { 1: 'Upper Body', 2: 'Lower Body', 3: 'Full Body' },
      2: { 1: 'Upper Body', 2: 'Lower Body', 3: 'Full Body' },
      3: { 1: 'Full Body',  2: 'Upper Body', 3: 'Lower Body', 4: 'Full Body' },
      4: { 1: 'Full Body',  2: 'Upper Body', 3: 'Lower Body', 4: 'Full Body' },
    },
  },
}

function programTitle(programName: string, week: number, day: number): string {
  const label = PROGRAM_SCHEDULES[programName]?.dayLabels[week]?.[day]
  return label ? `${programName} · W${week}D${day} · ${label}` : `${programName} · W${week}D${day}`
}

function nextProgramPosition(programName: string, sessionsCompleted: number): { week: number; day: number } | null {
  const schedule = PROGRAM_SCHEDULES[programName]
  if (!schedule) {
    const week = Math.floor(sessionsCompleted / 4) + 1
    const day = (sessionsCompleted % 4) + 1
    return { week, day }
  }
  let remaining = sessionsCompleted
  for (let w = 0; w < schedule.workoutsPerWeek.length; w++) {
    const inWeek = schedule.workoutsPerWeek[w]
    if (remaining < inWeek) return { week: w + 1, day: remaining + 1 }
    remaining -= inWeek
  }
  return null
}

// Pulls completed strength activities since the program started, derives the
// correct position, and writes it back to program_tracker if it drifted.
// Returns the (possibly-updated) program state so the briefing's prompt
// reflects yesterday's session regardless of when the user opens the app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function advanceProgramFromActivities(admin: any, userId: string, program: any) {
  if (!program) return program
  const startDate = program.started_at ?? program.last_completed_date
  if (!startDate) return program

  const { data: activities } = await admin
    .from('activities')
    .select('activity_date')
    .eq('user_id', userId)
    .eq('source', 'strava')
    .gte('activity_date', startDate)
    .ilike('title', '%strength%')
    .gt('duration_seconds', 600)
    .order('activity_date', { ascending: true }) as { data: { activity_date: string }[] | null }

  if (!activities || activities.length === 0) return program

  const distinctDates = [...new Set(activities.map(a => a.activity_date))].sort()
  const sessionsCompleted = distinctDates.length
  const next = nextProgramPosition(program.program_name, sessionsCompleted)
  if (!next) {
    // Program complete — flag inactive and reflect in the returned shape.
    await admin.from('program_tracker').update({ active: false }).eq('id', program.id)
    return { ...program, active: false }
  }

  if (next.week === program.current_week && next.day === program.current_day) {
    return program
  }

  const lastDate = distinctDates[distinctDates.length - 1]
  const updated = {
    current_week: next.week,
    current_day: next.day,
    next_workout_title: programTitle(program.program_name, next.week, next.day),
    last_completed_date: lastDate,
  }
  await admin.from('program_tracker').update(updated).eq('id', program.id)
  return { ...program, ...updated }
}

interface TrainingWeekRow {
  week_start: string
  phase_id: string | null
  phase_label: string | null
  focus: string | null
  notes: string | null
  key_marker: string | null
  quality_prescription: string | null
  strength_prescription: string | null
  target_run_miles: number | null
  target_long_run_miles: number | null
  target_cycling_miles: number | null
  target_strength_sessions: number | null
}

// Monday of the week containing `dateStr` (YYYY-MM-DD), local-anchored at noon
// so timezone math doesn't shift the result.
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString().substring(0, 10)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadAnchorsAndFamily(admin: any, userId: string, today: string): Promise<{
  anchorBlock: string
  familyBlock: string
  trainingWeekBlock: string
}> {
  const [anchorsRes, familyRes, trainingWeeksRes] = await Promise.all([
    admin.from('anchor_events')
      .select('slug, title, event_date, location, notes')
      .eq('user_id', userId),
    admin.from('family_members')
      .select('name, role, birthday')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
    admin.from('training_weeks')
      .select('week_start, phase_id, phase_label, focus, notes, key_marker, quality_prescription, strength_prescription, target_run_miles, target_long_run_miles, target_cycling_miles, target_strength_sessions')
      .eq('user_id', userId)
      .order('week_start', { ascending: true }),
  ])

  const anchors = (anchorsRes.data ?? []) as AnchorRow[]
  const family = (familyRes.data ?? []) as FamilyRow[]
  const trainingWeeks = (trainingWeeksRes.data ?? []) as TrainingWeekRow[]

  const anchorLines = anchors.map(a => {
    const days = daysBetween(today, a.event_date)
    const domain = ANCHOR_DOMAIN[a.slug]
    const parts = [
      domain ? `[${domain}]` : null,
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

  // Locate the current plan week (week_start == this Monday). Surface the
  // structured prescription so the model can name the day's prescribed
  // workout instead of inventing one or relying solely on the standalone
  // strength program tracker.
  const currentMonday = mondayOf(today)
  const idx = trainingWeeks.findIndex(w => w.week_start === currentMonday)
  let trainingWeekBlock = 'TRAINING WEEK: no plan-week row for this Monday'
  if (idx >= 0) {
    const w = trainingWeeks[idx]
    const lines: string[] = []
    lines.push(`TRAINING WEEK (WLW prep, W${idx + 1} of ${trainingWeeks.length}${w.phase_id ? ` · ${w.phase_id.toUpperCase()}` : ''}):`)
    if (w.key_marker) lines.push(`- Key marker: ${w.key_marker}`)
    if (w.focus) lines.push(`- Focus: ${w.focus}`)
    const targets: string[] = []
    if (w.target_run_miles)         targets.push(`${w.target_run_miles}mi run`)
    if (w.target_long_run_miles)    targets.push(`${w.target_long_run_miles}mi long run`)
    if (w.target_cycling_miles)     targets.push(`${w.target_cycling_miles}mi bike`)
    if (w.target_strength_sessions) targets.push(`${w.target_strength_sessions}× strength`)
    if (targets.length) lines.push(`- Targets: ${targets.join(' · ')}`)
    if (w.quality_prescription)  lines.push(`- Quality: ${w.quality_prescription}`)
    if (w.strength_prescription) lines.push(`- Strength block: ${w.strength_prescription}`)
    if (w.notes) lines.push(`- Notes: ${w.notes}`)
    trainingWeekBlock = lines.join('\n')
  }

  return { anchorBlock, familyBlock, trainingWeekBlock }
}

// Default to Denver when the client didn't (or couldn't) pass a location.
// Keeping a default avoids "no weather" briefings — the rest of the UI uses
// the same fallback in `src/lib/locations.ts` (DEFAULT_LOCATION).
const DEFAULT_BRIEFING_LOCATION = {
  lat: 39.7392, lon: -104.9903, name: 'Denver', elevation_ft: 5318,
}

const APP_TIMEZONE = 'America/Denver'

// Returns today's date as YYYY-MM-DD in the app's timezone (NOT UTC).
// `new Date().toISOString().substring(0, 10)` rolled the date forward to
// tomorrow on any Edge Function call made past 6pm Denver — that bug was
// stamping Sunday-evening briefing rows with Monday's plan_date.
function todayInAppTimezone(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
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

// Weight is measured periodically (~2-3x/week), not daily. Show the value and
// its age — that's it. No target, no "to goal." Body progress is framed
// through training metrics, not the scale.
function weightContextLine(weight: number | null, measuredAt: string | null): string {
  if (weight == null) return 'WEIGHT: never logged'
  if (!measuredAt) return `WEIGHT: ${weight} lbs`
  const daysAgo = Math.max(0, Math.floor((Date.now() - new Date(measuredAt).getTime()) / 86_400_000))
  const ago = daysAgo === 0 ? 'today' : daysAgo === 1 ? '1d ago' : `${daysAgo}d ago`
  return `WEIGHT: ${weight} lbs · weighed ${ago}`
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
    const today = todayInAppTimezone()

    // Force regeneration when the caller explicitly asks — used by the
    // apple-health-webhook chain so that a briefing generated earlier
    // (before recovery_signals landed) gets overwritten with fresh data.
    const forceRegenerate = body.force_regenerate === true

    // Return cached briefing if already generated today and not forced.
    if (!forceRegenerate) {
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
    const { anchorBlock, familyBlock, trainingWeekBlock } = anchorsAndFamily

    const systemPrompt = dayType === 'weekend'
      ? buildWeekendSystemPrompt(profile)
      : buildWeekdaySystemPrompt(profile)

    if (dayType === 'weekend') {
      // ── Weekend context ────────────────────────────────────────────────────
      const yesterday = prevDate(today, 1)

      const [recoveryRes, weightRes, lastEffortRes, weekendPlanRes, weatherStr, moodRes] = await Promise.all([
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
        owmKey ? fetchWeather(owmKey, location.lat, location.lon) : Promise.resolve(null),
        admin.from('daily_plans')
          .select('mood_score')
          .eq('user_id', user.id)
          .eq('plan_date', yesterday)
          .maybeSingle(),
      ])

      const signal = recoveryRes.data?.[0] as {
        rhr: number | null
        sleep_duration_hours: number | null
        drinks_consumed: number
        recovery_score: number | null
        recovery_tier: string | null
      } | undefined
      const yDrinks = (recoveryRes.data?.[1] as { drinks_consumed: number } | undefined)?.drinks_consumed ?? 0
      const yMood = (moodRes.data as { mood_score: number | null } | null)?.mood_score

      const weightRow = weightRes.data as { weight_lbs: number | null; measured_at: string | null } | null
      const weight = weightRow?.weight_lbs ?? null
      const weightMeasuredAt = weightRow?.measured_at ?? null

      const effort = lastEffortRes.data as {
        activity_type: string; title: string | null
        distance_miles: number | null; activity_date: string
      } | null
      // Noon anchor — activity_date is YYYY-MM-DD, bare parse is UTC midnight.
      const daysAgoEffort = effort
        ? Math.floor((Date.now() - new Date(effort.activity_date + 'T12:00:00').getTime()) / 86_400_000)
        : null

      const plan = weekendPlanRes.data as {
        activity_type: string | null; title: string | null
        location: string | null; departure_time: string | null; notes: string | null
      } | null

      const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

      contextMsg = `Today is ${dayName}, ${today}. It's a weekend.

${familyBlock}

${anchorBlock}

${trainingWeekBlock}

WEATHER (${locationStamp(location)}):
${weatherStr ? `- ${weatherStr}` : '- No weather data'}

RECOVERY:
- Score: ${signal?.recovery_score != null ? Math.round(signal.recovery_score) : 'unknown'}/100${signal?.recovery_tier ? ` · ${signal.recovery_tier.toUpperCase()}` : ''}
- RHR: ${signal?.rhr ?? 'no data'} bpm (baseline 63)
- Sleep: ${signal?.sleep_duration_hours != null ? `${signal.sleep_duration_hours.toFixed(1)}h` : 'no data'}
- Drinks yesterday: ${yDrinks}
- Mood yesterday (1-5): ${yMood ?? 'not logged'}

LAST BIG EFFORT:${effort
  ? `
- ${effort.activity_type} · ${effort.distance_miles != null ? `${effort.distance_miles.toFixed(1)}mi` : ''}${effort.title ? ` · "${effort.title}"` : ''} · ${daysAgoEffort === 0 ? 'today' : daysAgoEffort === 1 ? 'yesterday' : `${daysAgoEffort} days ago`}`
  : '\n- No recent activities'}

TODAY'S PLAN:${plan?.title
  ? `
- ${plan.activity_type ?? 'activity'} · ${plan.title}${plan.location ? ` · ${plan.location}` : ''}${plan.departure_time ? ` · leave ${plan.departure_time}` : ''}${plan.notes ? `\n- Notes: ${plan.notes}` : ''}`
  : '\n- No plan set yet'}

${weightContextLine(weight, weightMeasuredAt)}`

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
          .select('plan_date, family_creative_done, home_done, career_done, projects_done, family_creative_note, home_note, career_note, projects_note, mood_score')
          .eq('user_id', user.id)
          .lt('plan_date', today)
          .order('plan_date', { ascending: false })
          .limit(14),
      ])

      // Apple Health attributes overnight sleep / HRV / RHR to the date the
      // sleep STARTED — so the Tuesday-morning wake-up data lands in the
      // Monday signal_date row. Prefer today's row if the user's Shortcut
      // sends today's date, otherwise fall back to yesterday's row for the
      // wake-up state.
      type Signal = {
        signal_date: string
        rhr: number | null
        sleep_duration_hours: number | null
        drinks_consumed: number
        recovery_score: number | null
        recovery_tier: string | null
      }
      const signals = (recoveryRes.data ?? []) as Signal[]
      const todayRow = signals.find(r => r.signal_date === today)
      const yesterdayRow = signals.find(r => r.signal_date === yesterday)
      const wakeupSignal = (
        todayRow && (todayRow.rhr != null || todayRow.sleep_duration_hours != null)
          ? todayRow
          : yesterdayRow
      ) as Signal | undefined
      const todaySignal = wakeupSignal       // alias used by template below
      const ySignal = yesterdayRow as { drinks_consumed: number } | undefined
      // Self-correct the program from completed Strava strength sessions so
      // a workout logged yesterday but not yet reflected by the client-side
      // syncProgramFromStrava (which only runs when the user opens the
      // Training tab) doesn't leave the briefing one day behind.
      const program = (await advanceProgramFromActivities(admin, user.id, programRes.data)) as {
        program_name: string; current_week: number; current_day: number
        total_weeks: number | null; next_workout_title: string | null; last_completed_date: string | null
      } | null
      const inboxCount = inboxRes.count ?? 0
      const weightRow = weightRes.data as { weight_lbs: number | null; measured_at: string | null } | null
      const weight = weightRow?.weight_lbs ?? null
      const weightMeasuredAt = weightRow?.measured_at ?? null

      type ReviewRow = {
        plan_date: string
        family_creative_done: boolean; home_done: boolean
        career_done: boolean; projects_done: boolean
        family_creative_note: string | null; home_note: string | null
        career_note: string | null; projects_note: string | null
        mood_score: number | null
      }
      const reviewRows = (reviewRes.data ?? []) as ReviewRow[]
      const reviewCats = ['career', 'family_creative', 'home', 'projects'] as const
      // Labels mirror the Lists tabs (Career, Family, Home, Projects).
      const catLabels: Record<string, string> = {
        career: 'CAREER', family_creative: 'FAMILY', home: 'HOME', projects: 'PROJECTS',
      }
      // Career is weekday-only — Sat/Sun don't tick its light or inflate the rate.
      const isWeekendDay = (dateStr: string) => {
        const dow = new Date(dateStr + 'T12:00:00').getDay()
        return dow === 0 || dow === 6
      }
      const applicableCatsFor = (dateStr: string) =>
        isWeekendDay(dateStr)
          ? (['family_creative', 'home', 'projects'] as const)
          : reviewCats
      const pilotLights: Record<string, number> = {}
      for (const cat of reviewCats) {
        let days = 0
        for (const row of reviewRows) {
          if (row[`${cat}_done` as keyof ReviewRow]) break
          if (cat === 'career' && isWeekendDay(row.plan_date)) continue
          days++
        }
        pilotLights[cat] = days
      }
      const yReview = reviewRows[0]
      const yesterdayReviewLines = yReview
        ? applicableCatsFor(yReview.plan_date).map(cat => {
            const done = yReview[`${cat}_done` as keyof ReviewRow]
            const note = yReview[`${cat}_note` as keyof ReviewRow] as string | null
            return `  ${catLabels[cat]}: ${done ? `✓${note ? ` (${note})` : ''}` : '—'}`
          }).join('\n')
        : '  No review data for yesterday'

      // Cadence-aware MIT signal. Each category has its own expected interval;
      // "DARK" = past it. No aggregate %, no uniform-quota framing.
      const cadenceMap = {
        ...DEFAULT_CADENCE,
        ...(profile.category_cadence_days ?? {}),
      }
      const mitCadenceLines = reviewCats.map(cat => {
        const days = pilotLights[cat]
        const cadence = cadenceMap[cat]
        const status = days >= cadence ? 'DARK' : 'LIT'
        const suffix = cat === 'career' ? ' (weekdays only)' : ''
        return `  ${catLabels[cat]}: ${days}d since last · cadence ${cadence}d · ${status}${suffix}`
      }).join('\n')
      const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })

      contextMsg = `Today is ${dayName}, ${today}.
LOCATION: ${locationStamp(location)}

${familyBlock}

${anchorBlock}

${trainingWeekBlock}

RECOVERY:
- RHR: ${todaySignal?.rhr ?? 'no data'} bpm (baseline 63)
- Sleep: ${todaySignal?.sleep_duration_hours != null ? `${todaySignal.sleep_duration_hours.toFixed(1)}h` : 'no data'}
- Drinks yesterday: ${ySignal?.drinks_consumed ?? 0}
- Mood yesterday (1-5): ${yReview?.mood_score ?? 'not logged'}
- Recovery score: ${todaySignal?.recovery_score != null ? Math.round(todaySignal.recovery_score) : 'unknown'}/100${todaySignal?.recovery_tier ? ` · ${todaySignal.recovery_tier}` : ''}

WORKOUT:
- Prescribed: ${program?.next_workout_title ?? 'Total Strength (check program)'}
- Progress: W${program?.current_week ?? 1} of ${program?.total_weeks ?? 4} (${(program?.current_week ?? 1) - 1} weeks complete)

INBOX: ${inboxCount} unprocessed items
${weightContextLine(weight, weightMeasuredAt)}

YESTERDAY'S PORTFOLIO REVIEW:
${yesterdayReviewLines}

MIT CADENCE (each category has its own expected interval — DARK = past it):
${mitCadenceLines}`
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
