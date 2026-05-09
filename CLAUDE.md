# adadv3nture

> "a dad adventure" — three kids, a life in motion, built to last.

Personal health and productivity OS for Ben Wright. Unified fitness tracking,
intelligent workout prescription, weather-aware task management, time-aware
daily briefing, MIT framework, and a brain-dump inbox — all in one place.
The app knows what time it is, what the data says, and what hasn't been fed
enough lately. It tells you what to do today and gets out of the way.

---

## Current Session Goal

_Update this at the start of every Claude Code session._

```
NEXT PRIORITY: Strava OAuth — connect, backfill historic activities, display recent on Log tab
```

---

## What's Live (as of May 8, 2026)

**Migrations applied:** 001–012  
**Deployed to:** Vercel (auto-deploy from main branch)

| Area | Status |
|------|--------|
| Auth (Supabase email) | ✓ |
| Widget grid — time-aware (morning/mid/afternoon/evening views) | ✓ |
| Morning briefing (Anthropic claude-sonnet-4-6, Edge Function) | ✓ |
| Recovery score + tier (go_hard/moderate/recovery) | ✓ |
| Program tracker — Total Strength prescription | ✓ |
| Inbox — capture FAB + swipe triage (left=delete, right=MIT) | ✓ |
| Todo lists — career/family/home with urgency (fire/deck/rain) | ✓ |
| Persistent reminders | ✓ |
| Training tab — FOCO Fondo, Hurricane Ridge, WLW events + weekly targets | ✓ |
| Projects tab — Bottle Cap Bike + adadv3nture with milestones | ✓ |
| Inspiration widget — Supabase storage, "on this day", swipe ±4 days | ✓ |
| Photo backgrounds — seasonal on home screen, hero gradient on secondary pages | ✓ |
| Weather widget | ✓ |
| Strava OAuth — "Connect to Strava" button, recent workouts in activities table | ✓ |
| Withings OAuth + body metrics | ✗ |
| Google Calendar — WCalendar widget with "Connect" OAuth button | ✓ |
| Apple Health — iOS Shortcut fires at wake-up, posts RHR/HRV/sleep to Edge Function | ✓ |
| Drinks widget — +/- counter, 7-day avg | ✓ |
| Trends engine — charts, weekly summaries | ✗ |
| Daily check-in — mood, MIT portfolio check | ✗ |

---

## Brand & Design System

### Logo
FJ62 Land Cruiser front-on, desert Southwest / Monument Valley backdrop,
distressed badge treatment. Logo file: `/public/adadv3nture.png`

### Colors
```css
:root {
  --cream:       #F5EDD6;   /* background */
  --rust:        #C4522A;   /* primary accent, CTAs */
  --teal:        #5BBCB8;   /* secondary accent, active states */
  --dark:        #1A1208;   /* text, outlines */
  --sand:        #D4824A;   /* mid-tone, hover states */
  --sand-light:  #E8C99A;   /* subtle fills, cards */
  --rust-dark:   #8B3A1E;   /* deep accent */
}
```

### Typography
- **Display / Wordmark:** Bold condensed, uppercase — match the badge aesthetic
- **Body:** Clean, readable, slightly warm — not cold tech sans-serif
- **Numbers / Metrics:** Tabular figures, monospace-adjacent for data readability

### Aesthetic Direction
NOT corporate. NOT clinical. NOT a wellness app.
Field notebook meets morning newspaper for your life. Personal, warm, earned.
Data-dense but never overwhelming. The FJ62 in the Southwest desert is the
emotional anchor — rugged, capable, always going somewhere.
The app should feel like it was built for one person, because it was.

### UI Pattern: iOS Widget Dashboard
The app is a grid of widgets — each widget is one piece of life.
Inspired by iOS home screen and Apple Watch complications.

**Widget principles:**
- One concept per widget — workout, recovery, sleep, weight, drinks, MIT, calendar, inspiration
- Glanceable — you know the status in 2 seconds without reading
- Generous border radius (16-24px)
- Breathing room — never pack widgets together
- Tappable for detail view, but the surface tells you what you need
- Time-aware — different widgets feature based on time of day
- No heavy chrome, no gradients fighting each other

**Widget sizes (iOS-inspired):**
- Small (1x1) — single metric, one number, one status
- Medium (2x1) — metric + sparkline trend, or workout card
- Large (2x2) — MIT list, calendar, inspiration photo
- Full-width — daily briefing, day review

**Layout philosophy:**
A few hero widgets featured prominently based on time of day, supporting
widgets in a clean grid below. Mobile-first responsive. On desktop the
grid expands to 3-4 columns; on mobile it's 2 columns or stacked.

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite |
| Backend / DB | Supabase (Postgres, Auth, Edge Functions, Realtime) |
| Deployment | Vercel |
| AI Briefing | Anthropic API — claude-sonnet-4-6 |
| Fitness Sync | Strava OAuth2 |
| Body Metrics | Withings OAuth2 (Body Comp scale — arrives May 10 2026) |
| Calendar | Google Calendar API (read-write) |
| Weather | OpenWeatherMap API (geolocation-first, Denver fallback) |
| Apple Health | Health Auto Export → Supabase webhook |
| Styling | Tailwind CSS + CSS variables for brand tokens |
| Language | TypeScript strict mode |

---

## Architecture Principles

**Gartner Analytics Maturity Model** — build in layers, don't skip:
1. Descriptive → what happened (sync data, log activities)
2. Diagnostic → why it happened (trends, correlations)
3. Predictive → what will happen (recovery score, forecast)
4. Prescriptive → what to do about it (MIT generation, daily plan)

**MITs are generated by the data, not separate from it.**
What matters today is a direct output of what's been neglected, what's
time-sensitive, and what the recovery signals say. Data IS the MIT engine.

**Time-aware UI** — the app surfaces different information at different
times of day. Same data, different hero. One intelligent surface, not tabs.

**Graceful degradation** — never crash on nulls. Missing signals fall back
to schedule-based logic with uncertainty flagged honestly.

**Personal first, demo-ready** — single user v1. Supabase RLS enabled from
day one so multi-tenant is a refactor not a rewrite if this becomes a
Wright Adventures product. This app IS a portfolio piece.

**One tear-down rule** — like working on the FJ62: do all related work in
one session. Don't half-wire things and leave them.

**AI-assisted engineering** — Claude Code drives implementation. Ben directs
architecture. Discrete numbered prompts for sequential work.

**No secrets in code** — all API keys in `.env.local`. Never committed.

---

## User Context

```typescript
const USER_CONTEXT = {
  name: "Ben Wright",
  location: "Denver, CO",
  elevation_ft: 5318,
  age: 48,                      // born Sept 22, 1977
  email: "benw21@gmail.com",

  // Fitness baselines
  ftp_watts: 269,               // 20-min FTP test, March 5 2026
  mhr: 191,                     // observed max, Seattle hill, May 6 2026
                                // best-case sea level — Denver practical ~182-185
  rhr: 63,
  hrr: 128,

  hr_zones: {                   // Karvonen, calibrated for Denver 5,318ft
    z1_recovery:   [127, 139],
    z2_aerobic:    [139, 152],
    z3_tempo:      [152, 165],
    z4_threshold:  [165, 178],
    z5_vo2max:     [178, 191],
  },
  // Sea level: HR ceiling ~8bpm higher (altitude RBC adaptation)

  current_strength_program: "Total Strength (Andy Speer)",
  strength_week: 1,             // restarted May 11 2026 post-vacation
  strength_reactivation_weights: {
    chest_press_lbs: 25,
    curls_lbs: 20,
    dumbbell_flys_lbs: 10,
  },
  current_long_run_miles: 6.2,
  avg_run_pace: "9:35/mi",      // hilly Seattle terrain

  current_weight_lbs: 187,
  target_weight_lbs: 178,       // Project Six Pack
  on_glp1: true,                // started November 2024
                                // track trends not daily fluctuations

  school_dropoff: "7:15am",
  workout_window: "7:40-9:30am",
  planning_session: "9:30am",
  school_pickup: "2:30pm",
  kids_home: "3:45pm",
  project_hour: "4:00-5:00pm",
  run_club: "Monday evenings, Wash Park (family joins 1x/month)",

  kids: [
    { name: "Chase", age: 8.5, note: "wants to shoot hoops/throw ball" },
    { name: "Ada", age: 7, note: "ninja training course, self-sufficient" },
    { name: "Sylvia", age: 5, note: "needs more engagement, good truck helper" },
  ],
  wife: "Tangier Barnes Wright",
  wife_employer: "PeopleForBikes",

  truck: "1988 Toyota Land Cruiser FJ62 (V3NTRUS)",
  truck_goal: "250K → 500K miles",

  runs_in_rain: true,
  avoids_biking_outside_in_rain: true,
  higher_heat_tolerance_on_bike: true,
  dislikes_running_july_august: true,
  trail_runs_at: "Howard, CO (the ranch — 20min from Buena Vista)",
};
```

---

## Life Portfolio — The MIT Framework

**Two non-negotiables (tracked but never compete for MIT slots):**
- **BODY** → 7:40am workout. Always happens. Always logged.
- **CAREER** → Mid-morning block. Wright Adventures daily. Non-negotiable.
  Labor Day is fish-or-cut-bait: WA income or get a real job.

**Five rotating categories (generate the daily MITs):**

| Category | What it covers | Natural slot |
|----------|---------------|--------------|
| FAMILY/CREATIVE | Kids, intentional presence, art, making things | 4pm — often combined |
| HOME | House projects, truck, ranch | 4pm — weather dependent |
| FINANCIAL | Specific tasks (Ben is good with money — specific blockers only) | Mid-morning |
| PERSONAL | Relationships, errands that matter, inbox items | Anytime |
| MIND | Rest, gaming, reading, sports — PROTECTED, never a MIT | Evening only |

**MIT generation logic:**
- Score categories by neglect + deadline pressure
- Surface top 2-3 MITs from highest-scoring categories
- Never more than 2 from same category
- Persistent reminders surface before rotating MITs
- MIND is never assigned as MIT — protected restoration time

**Thinking prompt:**
One specific unresolved question generated from yesterday's MIT completion data.
Something worth chewing on during the 7:40am workout. Not motivational fluff.
Answered at the 9:30am triage session — becomes tomorrow's context.

**Pilot lights:**
Each category has a flame. Too long without attention = flame dims.
Goal: keep all five lit, not burn one bright while others go dark.

---

## Time-Aware UI

The app is a widget grid. Different widgets feature based on time of day,
but all widgets are accessible at all times. Hero widgets are sized larger
and positioned prominently. Supporting widgets are smaller and below.

```
MORNING (7:35-9:30am)
Hero widgets: Workout · Thinking Prompt · Weather
Supporting: Recovery · Drink Ratio · Inspiration · Labor Day countdown

MID-MORNING (9:30am-2:30pm)
Hero widgets: Wright Adventures · Today's MITs · Inbox triage
Supporting: Calendar · Recovery · Drink Ratio · Inspiration

AFTERNOON (2:30-6pm)
Hero widgets: 4pm Project · Weather · Kids context
Supporting: Art deadline (if active) · Calendar · Inspiration · MITs

EVENING (6pm+)
Hero widgets: Day Review · Drink count entry · Tomorrow preview
Supporting: Inbox capture · Inspiration · MIT completion
```

**Widget catalog:**

| Widget | Size | Description |
|--------|------|-------------|
| Workout | 2x1 | Today's workout, recovery score, intensity |
| Thinking Prompt | 2x1 | Question to chew on during workout |
| Recovery | 1x1 | Score + tier (go hard / moderate / recovery) |
| Weight | 1x1 | Current weight + 7-day trend arrow |
| Body Comp | 2x1 | Body fat % + muscle mass % |
| Drinks | 1x1 | Today's count + 7-day average |
| Sleep | 1x1 | Last night's score + duration |
| MITs | 2x2 | Three MITs with checkboxes |
| Calendar | 2x1 | Today's events, next 3 |
| 4pm Project | 2x1 | Weather-aware todo for project hour |
| Weather | 1x1 | Current + today's high/low |
| Inspiration | 2x2 | Adventure photo from this date in past |
| Inbox | 2x1 | Unprocessed count + quick capture |
| Labor Day Countdown | 1x1 | Days remaining + "WA or job" |
| Event Countdown | 1x1 | Next target event (West Line Winder, etc.) |
| Career | 2x1 | Active proposals, next action |
| Art Deadline | 1x1 | Days to gallery + next step (when active) |
| Day Review | 2x2 | MIT check-off, drinks, mood (evening only) |

**Workout recommendation factors (priority order):**
1. Weather (rain → no outdoor ride; heat → prefer bike over run)
2. Location (Howard = trail run; travel = bodyweight/run)
3. Recovery score (RHR + sleep + drinks + days since rest)
4. Training phase (run base / cycling / trail focus / taper)
5. Program sequence (Total Strength next session)
6. Schedule (Run Club Monday = always run, never override)

---

## Drink Tracking

Not a streak. A ratio. Goal: ≤ 2 drinks/day average.

```
Today: 1 drink
7-day avg: 0.8/day    ↓ improving
30-day avg: 1.4/day   ↓ improving
Goal: ≤ 2.0/day       ✓ on track
```

UI: Simple +/- in evening mode. One tap = one drink. No confirmation needed.
Display as ratio trend, not pass/fail. Green ≤ 2, amber approaching 2.
Schema: `drinks_consumed integer` in recovery_signals. NOT boolean.

---

## Inbox & Capture

Brain is for having ideas, not holding them. The inbox offloads everything.
Value is the offload, not the reminder.

**Capture UX:**
- Floating action button visible on EVERY screen, always
- One tap → text field → enter → done
- Voice input on mobile
- Zero categorization at capture time
- Must work at 11pm half-asleep

**Morning triage (9:30am, 2 min):**
Each item: [ Route to list ] [ MIT today ] [ Delete ]

**Routing:**
- Requires time + intention → MIT or personal task
- Has deadline → persistent reminder
- House/truck → todo list
- Career action → WA pipeline
- Quick errand → personal tasks
- Not important → delete

---

## Trends Engine

Report card format — scannable in 10 seconds. Tap any row for full chart.

```
Weight        183.2 lbs    ↓ 1.8/month     ✓
Body fat %    22.8%        ↓ 0.4%/month    ✓
Miles run     18.2/wk      ↑ from 14.1     ↑
Workouts/wk   5            → same          →
RHR           61 bpm       ↓ from 63       ✓
Drinks/day    1.4          ↓ from 2.8      ✓
MIT complete  73%          ↑ 12%           ↑  ← THE meta-metric
```

Comparisons: this week vs last, this month vs last, rolling 28 vs 90 day.
Weekly summaries pre-computed nightly — never compute on the fly.

---

## Inspiration Widget — Adventure Memory

**Philosophy:** Data motivates the analytical brain. Photos motivate the soul.
Ben has decades of adventure photography — rafting, alpine touring, hiking,
biking, family trips. The app surfaces these as random "on this day" moments
to remind him who he is when "why bother" creeps in.

**Core interaction:**
- Widget surfaces ONE photo at a time
- Pulled by date proximity — "5 years ago today" / "8 years ago this week"
- Caption shows location, year, activity
- Tap to expand, swipe for next memory
- Refreshes daily — new photo each morning

**Why this matters for Ben specifically:**
- External motivators work better than abstract goals
- Reminds him of physical capability he's already demonstrated
- Connects current boot camp to lifetime adventure identity
- Photos of past trips with friends/family activate social motivation
- "I've done hard things before" is a more honest motivator than quotes

**The data model:**

```sql
create table inspiration_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  -- Storage
  storage_path text not null,        -- Supabase Storage path
  thumbnail_path text,               -- pre-generated 400px thumb
  -- Metadata
  taken_at date not null,            -- date the photo was taken
  location text,                     -- "Salmon River, ID" or "Berthoud Pass"
  activity_type text,                -- 'rafting' | 'alpine' | 'hiking' | 'biking'
                                     -- | 'family' | 'kids' | 'travel' | 'other'
  caption text,                      -- "Day 3 of the Middle Fork"
  people text[],                     -- who was there
  -- Surfacing
  times_surfaced integer default 0,
  last_surfaced_at timestamptz,
  user_starred boolean default false, -- favorites get higher rotation
  -- Original file metadata
  original_filename text,
  exif_data jsonb,
  created_at timestamptz default now()
);

-- Index for "on this day" queries
create index idx_inspiration_taken_at on inspiration_photos(taken_at);
```

**Surfacing algorithm:**

```typescript
function selectDailyInspiration(userId: string): InspirationPhoto {
  const today = new Date();
  const targetMonth = today.getMonth() + 1;
  const targetDay = today.getDate();

  // Priority 1: photos from THIS exact date in past years
  // (within 3 day window for flexibility)
  const onThisDay = await query(`
    select * from inspiration_photos
    where extract(month from taken_at) = ${targetMonth}
      and abs(extract(day from taken_at) - ${targetDay}) <= 3
    order by 
      user_starred desc,
      times_surfaced asc,
      taken_at asc
    limit 5
  `);

  if (onThisDay.length > 0) {
    // Random from top 5 to avoid same photo every year
    return randomChoice(onThisDay);
  }

  // Priority 2: photos from this season in past years
  // (same month, any day)
  const thisSeason = await query(`
    select * from inspiration_photos
    where extract(month from taken_at) = ${targetMonth}
    order by 
      user_starred desc,
      times_surfaced asc
    limit 10
  `);

  if (thisSeason.length > 0) return randomChoice(thisSeason);

  // Priority 3: any photo, weighted toward less-surfaced
  return await query(`
    select * from inspiration_photos
    order by times_surfaced asc, random()
    limit 1
  `);
}
```

**Photo upload flow:**

V1 — Lightroom-first bulk upload (this week):
- Source: Adobe Lightroom (where most photos live, already keyworded)
- Create smart collection in Lightroom: "adadv3nture inspiration"
  - Filter by keywords: rafting, alpine, hiking, biking, kids, family, travel
  - Optionally filter by rating ≥ 4 stars
- Export from Lightroom as JPEG:
  - Long edge 1920px (good for retina display, reasonable file size)
  - Quality 85
  - Include all metadata (EXIF, IPTC keywords)
  - Filename template: `{date}_{filename}` (e.g. 2018-07-23_IMG_4521.jpg)
- Drag-drop into app upload interface
- App auto-extracts EXIF date for `taken_at`
- Batch caption interface: edit location, activity_type, caption, people

V2 — Apple Photos for family additions (later):
- Family adventures mostly captured on iPhone
- Create album "adadv3nture family" in Apple Photos
- Periodic export → bulk upload
- Lower volume, easier to curate manually

V3 — Optional automation:
- Adobe Lightroom CC API for automated sync (if photos are in cloud)
- Or quarterly manual upload of "best of last quarter"
- Anthropic API to generate caption suggestions from EXIF + image content

V4 — macOS companion app (only if needed):
- Native PhotoKit integration with Apple Photos
- Auto-syncs new photos matching adventure criteria
- Probably overkill — manual upload likely sufficient

**Activity types to support:**
- `rafting` — river trips, multi-day
- `alpine` — alpine touring, ski mountaineering
- `skiing` — resort, backcountry
- `hiking` — day hikes, peaks, trails
- `biking` — road, gravel, mountain
- `running` — trail runs, races
- `climbing` — rock, ice
- `family` — family trips, vacations together
- `kids` — adventures with the kids specifically
- `travel` — destinations, international
- `other` — catch-all for anything that doesn't fit

**The widget UI:**

```
┌─────────────────────────────────┐
│ 🏔  ON THIS DAY                 │
│                                 │
│ [    Photo — full bleed     ]   │
│ [                            ]   │
│ [                            ]   │
│                                 │
│ Salmon River · 2018             │
│ "Middle Fork day 3 with Shane"  │
└─────────────────────────────────┘
```

Full-bleed photo, minimal text overlay at bottom. Subtle, warm, real.

**Storage considerations:**
- Supabase Storage free tier: 1GB, sufficient for ~500 photos at 2MB
- Pro tier: 100GB, sufficient for thousands
- Auto-generate thumbnails (400px) for widget display
- Full resolution loaded only on tap-to-expand
- Can integrate with Cloudflare R2 or S3 if scale grows

---

## Target Events

| Event | Date | Details | Status |
|-------|------|---------|--------|
| Velo-city Conference | June 16-19 2026 | Rimini Italy — Tangier's conference | Confirmed |
| FOCO Fondo "Double Dog Dare You" | July 19 2026 | 62.6mi / 2,962ft gravel | Conditional on Italy |
| Ride the Hurricane | Aug 2 2026 | 40mi / 5,250ft, Port Angeles WA | Conditional on Slovenia |
| **West Line Winder 30K** | **Sept 26 2026** | **18.6mi trail, Buena Vista CO** | **ANCHOR — REGISTER NOW** |

Training phases:
```
May 11 → July 1      Run base + Strength + intro cycling
July 1 → Aug 15     Cycling primary + travel
Aug 15 → Sept 20    Trail running focus
Sept 22             48th birthday 🎂
Sept 26             West Line Winder 30K 🏔️
```

Howard ranch runs = West Line Winder race-specific training (20min from BV).

---

## Database Schema

```sql
-- USERS
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  baseline_rhr integer default 63,
  mhr integer default 191,
  rhr integer default 63,
  ftp_watts integer default 269,
  weight_lbs numeric,
  height_inches integer default 71,
  timezone text default 'America/Denver',
  preferences jsonb default '{}',
  created_at timestamptz default now()
);

-- ACTIVITIES (unified — Strava + manual)
create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  source text not null check (source in ('strava', 'peloton', 'manual')),
  activity_type text not null,
  title text,
  activity_date date not null,
  start_time timestamptz,
  duration_seconds integer,
  distance_miles numeric,
  elevation_feet numeric,
  calories integer,
  avg_hr integer,
  max_hr integer,
  avg_pace_seconds_per_mile integer,
  avg_watts integer,
  total_output_kj numeric,
  tss numeric,
  strava_id bigint unique,
  peloton_id text unique,
  raw_json jsonb,
  notes text,
  created_at timestamptz default now()
);

-- BODY METRICS (Withings Body Comp + manual)
create table body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  measured_at timestamptz not null,
  source text not null check (source in ('withings', 'manual')),
  weight_lbs numeric,
  body_fat_pct numeric,
  muscle_mass_lbs numeric,
  muscle_mass_pct numeric,
  bone_mass_lbs numeric,
  water_pct numeric,
  bmi numeric,
  visceral_fat integer,
  bmr integer,
  withings_id bigint unique,
  created_at timestamptz default now()
);

-- RECOVERY SIGNALS (Apple Health + manual)
create table recovery_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  signal_date date not null,
  rhr integer,
  hrv_ms numeric,
  sleep_score integer,
  sleep_duration_hours numeric,    -- null if watch charged overnight. NOT zero.
  drinks_consumed integer default 0, -- integer not boolean. Goal ≤ 2/day avg.
  source text default 'apple_health',
  recovery_score numeric,
  recovery_tier text,              -- 'go_hard' | 'moderate' | 'recovery' | 'unknown'
  created_at timestamptz default now(),
  unique(user_id, signal_date)
);

-- PROGRAM TRACKER (prescription only — Strava handles logging)
create table program_tracker (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  program_name text not null,
  instructor text,
  current_week integer default 1,
  current_day integer default 1,
  total_weeks integer,
  next_workout_title text,
  next_workout_url text,
  next_workout_type text,
  last_completed_date date,
  started_at date,
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

-- DAILY PLANS
create table daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  plan_date date not null,
  recovery_score numeric,
  recovery_tier text,
  recommended_workout_type text,
  recommended_intensity text,
  peloton_class_suggestion text,
  peloton_class_url text,
  reasoning jsonb,
  thinking_prompt text,
  thinking_prompt_answer text,
  actual_activity_id uuid references activities(id),
  plan_status text default 'planned',
  -- Portfolio daily check-in
  family_creative_done boolean default false,
  family_creative_note text,
  home_done boolean default false,
  home_note text,
  financial_done boolean default false,
  financial_note text,
  personal_done boolean default false,
  personal_note text,
  -- Drink tracking (manual entry)
  drinks_today integer default 0,
  mood_score integer check (mood_score between 1 and 5),
  morning_briefing text,
  briefing_generated_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, plan_date)
);

-- TODOS (house + truck, weather-aware, drag-drop ordered)
create table todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  category text not null check (category in ('house', 'truck')),
  title text not null,
  notes text,
  weather_required text default 'any' check (weather_required in ('any', 'dry', 'sunny')),
  effort text check (effort in ('quick', 'half_day', 'full_day', 'multi_day')),
  who_required text default 'solo',
  blocked_by uuid references todos(id),
  priority_order integer not null default 0,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- INBOX (brain dump — capture everything, triage later)
create table inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  content text not null,
  captured_at timestamptz default now(),
  processed boolean default false,
  processed_at timestamptz,
  converted_to text,
  converted_id uuid,
  notes text
);

-- PERSONAL TASKS
create table personal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  notes text,
  due_date date,
  priority_order integer default 0,
  status text default 'todo' check (status in ('todo', 'done')),
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- PERSISTENT REMINDERS (surfaces daily until done, max 1-day snooze)
create table persistent_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  category text,
  urgency text default 'medium',
  surfaces_daily boolean default true,
  snoozed_until date,
  completed_at timestamptz,
  created_at timestamptz default now()
);
-- Seed: 'File unemployment claim/appeal — $800/wk WA runway', 'financial', 'high'

-- CALENDAR EVENTS (Google Calendar cache)
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  google_event_id text unique,
  title text,
  event_date date,
  start_time timestamptz,
  end_time timestamptz,
  event_type text default 'other',
  all_day boolean default false,
  synced_at timestamptz default now()
);

-- WEEKLY SUMMARIES (pre-computed nightly by Edge Function)
create table weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  week_start date not null,
  avg_weight_lbs numeric,
  avg_body_fat_pct numeric,
  avg_muscle_mass_pct numeric,
  total_miles_run numeric,
  total_workouts integer,
  total_duration_hours numeric,
  zone2_minutes integer,
  zone3plus_minutes integer,
  avg_rhr numeric,
  avg_sleep_score numeric,
  avg_drinks_per_day numeric,
  longest_run_miles numeric,
  best_pace_per_mile integer,
  mit_completion_pct numeric,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

-- ANNOTATIONS (milestone markers on trend charts)
create table annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  annotation_date date not null,
  label text not null,
  category text,
  note text,
  show_on_charts boolean default true,
  created_at timestamptz default now()
);
-- Seeds: GLP-1 Nov 2024, Anniversary Jun 2025, Boot Camp May 11 2026,
--        Labor Day Sep 1 2026, West Line Winder Sep 26 2026

-- TODOS — actual categories in use
-- category check: ('body', 'career', 'family', 'home', 'personal')
-- urgency: 'fire' | 'deck' | 'rain' (added migration 009)
-- UI tabs: TRAINING (event view), CAREER, FAMILY, HOME, PROJECTS (project view)
-- body → Training tab, personal → Projects tab (todo lists for career/family/home only)

-- TRAINING GOALS (anchor events — WLW, FOCO Fondo, Hurricane Ridge)
create table training_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  event_name text not null,
  event_date date not null,
  event_type text check (event_type in ('trail_run', 'cycling_road', 'cycling_gravel')),
  distance_label text,
  elevation_label text,
  location text,
  is_anchor boolean default false,
  status text default 'active' check (status in ('active', 'complete', 'skipped')),
  notes text,
  created_at timestamptz default now()
);

-- TRAINING WEEKS (target vs actual, phase tracking)
create table training_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  week_start date not null,
  phase_label text not null,
  target_run_miles numeric,
  target_long_run_miles numeric,
  target_cycling_miles numeric,
  target_strength_sessions integer,
  actual_run_miles numeric,
  actual_cycling_miles numeric,
  actual_strength_sessions integer,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

-- PROJECTS (Bottle Cap Bike, adadv3nture, etc.)
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  description text,
  category text check (category in ('art', 'software', 'home', 'career', 'other')),
  deadline_date date,
  soft_deadline_date date,
  progress_pct integer default 0 check (progress_pct between 0 and 100),
  next_action text,
  status text default 'active' check (status in ('active', 'complete', 'paused')),
  created_at timestamptz default now()
);

create table project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  done boolean default false,
  done_at timestamptz,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  note text not null,
  created_at timestamptz default now()
);

-- OAUTH TOKENS
create table oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  provider text not null check (provider in ('strava', 'withings', 'google')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  updated_at timestamptz default now(),
  unique(user_id, provider)
);
```

---

## Intelligence Layer

### Recovery Score

```typescript
function computeRecoveryScore(inputs: {
  rhr: number | null,
  baseline_rhr: number,
  sleep_score: number | null,      // null ≠ bad sleep (watch charging)
  drinks_yesterday: number,
  days_since_rest: number,
}): { score: number, tier: string, confidence: string } {

  const signals = [];

  if (inputs.rhr !== null) {
    const delta = inputs.rhr - inputs.baseline_rhr;
    signals.push({ score: Math.max(0, 100 - (delta/7)*100), weight: 0.40 });
  }

  if (inputs.sleep_score !== null) {
    signals.push({ score: inputs.sleep_score, weight: 0.30 });
  }

  const drink_score = Math.max(0, 100 - (inputs.drinks_yesterday * 25));
  signals.push({ score: drink_score, weight: 0.20 });

  const rest_score = Math.max(0, 100 - (inputs.days_since_rest * 20));
  signals.push({ score: rest_score, weight: 0.10 });

  const total_weight = signals.reduce((s, x) => s + x.weight, 0);
  const score = signals.reduce((s, x) => s + (x.score * x.weight), 0) / total_weight;
  const confidence = signals.length >= 3 ? 'high' : signals.length === 2 ? 'medium' : 'low';
  const tier = score > 80 ? 'go_hard' : score > 60 ? 'moderate' : 'recovery';

  return { score, tier, confidence };
}
```

### Morning Briefing System Prompt

```typescript
const BRIEFING_SYSTEM_PROMPT = `
You are Ben's personal daily briefing for adadv3nture.

About Ben:
- 48yo dad, Denver CO (5,318ft), kids: Chase (8.5), Ada (7), Sylvia (5)
- Building Wright Adventures — software for good, working for himself
- Labor Day 2026: WA income or get a real job. Fish or cut bait.
- GLP-1 since Nov 2024. Target 178-182 lbs (currently ~187)
- Drink ratio goal: ≤ 2/day average
- External accountability works better than abstract goals
- West Line Winder 30K Sept 26 — birthday weekend anchor event
- "Why bother" creeps in when progress stalls — counter with specific action

Tone: Direct. Warm. Specific. Never generic. Never wellness-app cheerful.
Reference real numbers. Flag uncertainty honestly. Max 150 words.
Always end with ONE specific next action — not a category, an actual step.
`;
```

---

## Build Order

```
✓ 01. Project init — Vite + React 19 + TypeScript + Tailwind + Supabase
✓ 02. Supabase schema — migrations 001-012, RLS, seed data
✓ 03. Auth — Supabase (email + Google OAuth via Supabase)
✓ 04. Widget grid shell — time-aware views (morning/mid/afternoon/evening)
✓ 05. Inbox — FAB capture, swipe triage (left=delete, right=MIT)
✓ 06. Todo lists — career/family/home, urgency fire/deck/rain, drag reorder
✓ 07. Persistent reminders
✓ 13. Recovery score — compute, display tier + confidence
✓ 14. Program tracker — Total Strength prescription, next workout
✓ 15. Daily plan + thinking prompt
✓ 16. Morning briefing — Anthropic API, Edge Function, server-side only
✓ 17. Weather — OpenWeatherMap widget
✓ 19. Inspiration widget — Supabase Storage, "on this day", swipe ±4 days
  +. Training tab — event cards (FOCO/Hurricane/WLW), weekly targets
  +. Projects tab — Bottle Cap Bike + adadv3nture, milestones, next action
  +. Design system — Glass grain, CardLabel dot, WMorningHero, LockStrip

✓ 08. Strava OAuth — "Connect to Strava" button, pulls recent workouts into activities table
  09. Withings OAuth — connect, sync metrics, weight trend chart
  10. Daily check-in — drinks +/- counter, mood
✓ 11. Google Calendar — OAuth via "Connect" button in WCalendar widget, reads events
✓ 12. Apple Health webhook — Edge Function deployed, Health Auto Export → Supabase
  18. Trends engine — weekly summaries, report card UI, charts
  20. Historic import — Strava backfill, Peloton CSV, weight CSV
  21. Polish — mobile empty states, event countdowns
```

---

## API Integrations

**Strava:** OAuth2 `activity:read_all` · webhook + paginated backfill
**Withings Body Comp:** OAuth2 · `POST /measure?action=getmeas` · webhook
**Google Calendar:** OAuth2 `calendar.events` · read + write
**OpenWeatherMap:** geolocation-first · Denver fallback `39.7392, -104.9903` · Howard `38.4192, -105.8283`
**Apple Health:** Health Auto Export → `/functions/v1/apple-health-webhook` · historic export on setup · nulls handled gracefully
**Anthropic:** claude-sonnet-4-6 · server-side Edge Function only · never expose key to client

---

## Environment Variables

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
VITE_STRAVA_REDIRECT_URI=
WITHINGS_CLIENT_ID=
WITHINGS_CLIENT_SECRET=
VITE_WITHINGS_REDIRECT_URI=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
VITE_GOOGLE_REDIRECT_URI=
VITE_OPENWEATHER_API_KEY=
ANTHROPIC_API_KEY=          # server-side ONLY
```

---

## Key Domain Rules

1. **Elevation** — HR zones for Denver 5,318ft. Sea level = ~8bpm higher ceiling. Flag when traveling.
2. **GLP-1** — 7-day rolling weight averages. Muscle mass % is the primary metric.
3. **Drinks = ratio not streak** — `drinks_consumed integer`. Goal ≤ 2.0/day. Trend display only.
4. **Labor Day** — Sept 1 2026. Career block every day, non-negotiable. Show countdown.
5. **Run Club sacred** — Monday evenings, Wash Park. Never override. Family joins 1x/month.
6. **4pm is the critical hour** — project slot replaces the drink trigger. Always surface weather-appropriate todo.
7. **Weather drives 4pm:** sunny → outdoor house/truck · rainy → indoor house/truck interior
8. **Program tracker = prescription only** — Strava logs what happened. Program tracker says what's next.
9. **Inbox = entry point for everything** — floating button, always visible, zero friction.
10. **MIND is protected** — never a MIT. Evening is Ben's. Track but never colonize.
11. **West Line Winder = anchor event** — Sept 26, Buena Vista. Birthday weekend. Howard runs = race training.
12. **MIT completion rate = meta-metric** — more important than any single fitness number.
13. **External accountability** — Ben responds to public commitments + hard dates. Surface event countdowns prominently.
14. **Wright Adventures = the meaning** — not just revenue. Morning briefing should occasionally reflect this when "why bother" creeps in.

---

## Wright Adventures Context

**Active proposals:**
- PeopleForBikes (Jenn Dice, CEO) — AI/BIDE intelligence layer · $50-85K
  Jenn replied May 6: data team call invited. José + Liam on thread.
  Next action: reply to Jenn, confirm call with data team.
- GSEMA — $50K technology assessment RFP · active pursuit

**Job targets:** Coforma (Principal Product Engineer — strong fit) · Change Research · Murmuration · Skylight

**Fractional CTO target:** $5-8K/month × 2-3 clients + project contracts
Differentiation: JD + AI tooling + 30yr dev = can read contracts AND write code.

**Brand:** wrightadventures.org
Summit Navy #004667 · River Blue #009DD6 · Earth Orange #B44B00 · Trail Green #4A7C59
"Building the Pathways to Connect People to Place."

---

## File Structure

```
adadv3nture/
├── CLAUDE.md
├── docs/adr/
├── public/
│   └── adadv3nture.png
├── src/
│   ├── components/
│   │   ├── widgets/                  # one folder per widget type
│   │   │   ├── Widget.tsx            # base wrapper with size variants
│   │   │   ├── WorkoutWidget.tsx
│   │   │   ├── ThinkingPromptWidget.tsx
│   │   │   ├── RecoveryWidget.tsx
│   │   │   ├── WeightWidget.tsx
│   │   │   ├── BodyCompWidget.tsx
│   │   │   ├── DrinksWidget.tsx
│   │   │   ├── SleepWidget.tsx
│   │   │   ├── MITsWidget.tsx
│   │   │   ├── CalendarWidget.tsx
│   │   │   ├── ProjectHourWidget.tsx
│   │   │   ├── WeatherWidget.tsx
│   │   │   ├── InspirationWidget.tsx
│   │   │   ├── InboxWidget.tsx
│   │   │   ├── CountdownWidget.tsx
│   │   │   ├── CareerWidget.tsx
│   │   │   ├── ArtDeadlineWidget.tsx
│   │   │   └── DayReviewWidget.tsx
│   │   ├── dashboard/
│   │   │   ├── WidgetGrid.tsx        # time-aware grid layout
│   │   │   └── useWidgetLayout.ts    # decides which widgets feature
│   │   ├── inbox/
│   │   ├── todos/
│   │   ├── trends/
│   │   ├── inspiration/
│   │   │   ├── PhotoUpload.tsx       # bulk upload + EXIF parse
│   │   │   └── PhotoDetail.tsx       # tap-to-expand view
│   │   └── ui/
│   ├── hooks/
│   │   ├── useTimeOfDay.ts
│   │   ├── useWeather.ts
│   │   ├── useRecovery.ts
│   │   └── useInspiration.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── strava.ts
│   │   ├── withings.ts
│   │   ├── google-calendar.ts
│   │   ├── openweather.ts
│   │   ├── recovery.ts
│   │   ├── mit-engine.ts
│   │   └── inspiration.ts
│   ├── pages/
│   ├── types/
│   └── main.tsx
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   ├── storage/                      # bucket config for photos
│   └── functions/
│       ├── apple-health-webhook/
│       ├── strava-webhook/
│       ├── withings-webhook/
│       ├── weekly-summaries/
│       ├── morning-briefing/
│       └── photo-thumbnail/          # generates 400px thumbs on upload
└── .env.local
```

---

*Last updated: May 8, 2026*
*Boot camp starts: May 11, 2026 — Total Strength W1D1 Monday*
*Built with AI-assisted engineering — Claude Code + Ben Wright*