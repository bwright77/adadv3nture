# adadv3nture

<p align="center">
  <img src="public/adadv3nture.png" alt="adadv3nture" width="220" />
</p>

> "a dad adventure" — mission control for my life.

I'm building a career, raising three kids, keeping a house running, training for a 30K in September, and staying connected to the things that are just mine.

**adadv3nture** is how I use software to do all of it better. One place where career, family, home, body, and personal projects all live together. Every morning it surfaces my Most Important Tasks across all five — not what's loudest, not what's overdue, but what actually moves the needle today.

Strava. Apple Health. Google Calendar. Weather. Recovery. MITs. All of it, one place. The control center for my life.

---

## Features

### Time-Aware Dashboard
The home screen surfaces different widgets based on time of day — same data, different hero. **Weekday** has four modes: Morning (7:35–9:30am), Mid-Morning (9:30am–2:30pm), Afternoon (2:30–6pm), Evening (6pm+). **Weekend** has four modes: Dawn (6–9am), The Day (9am–5pm), Saturday Evening, Sunday Evening. Block can be manually overridden from the header picker.

### Weekend Mode
Fully separate widget composition for Saturday and Sunday — same Glass card system, different content hierarchy. Weekdays optimize; weekends expand.

| View | Key Widgets |
|------|-------------|
| Dawn | Morning briefing (weekend voice), workout, conditions, family day, 50 Hikes |
| The Day | Adventure today, long effort tracker, project session, 50 Hikes |
| Saturday Evening | Day review, drinks, calendar, inspiration |
| Sunday Evening | Week ahead (Mon calendar + Run Club + training targets), review, tomorrow |

Weekend morning briefing uses a distinct system prompt — "What's the move today?" instead of MIT neglect-scoring. Pulls live Denver weather server-side.

### Widget Grid
iOS-style widget grid built from composable Glass cards:

| Widget | What it shows |
|--------|--------------|
| Morning Hero | Recovery gauge + workout prescription + AI briefing |
| Workout | Today's program session (Total Strength W1D1, etc.) |
| Thinking Prompt | One question to chew on during the workout |
| Recovery | Score + tier (Go Hard / Moderate / Recovery) |
| Steps | Yesterday's step count + 7-day sparkline |
| Drinks | Today's count + 7-day average, ratio not streak |
| Weather | Current conditions + today's high/low |
| Forecast | 5-day forecast with activity recommendations |
| Conditions | Denver road + Howard trail conditions side-by-side |
| Calendar | Today's events from Google Calendar |
| MITs | Most Important Tasks with checkbox triage |
| Inbox | Unprocessed capture count + quick entry |
| On This Day | Adventure photo from this date in past years |
| Pilot Lights | Days since last activity per life category |
| Day Review | Evening check-in for each life portfolio category + 1–5 mood selector |
| Tomorrow | Next day workout + weather + focus areas |
| Career Anchor Countdown | Weeks + days to the editable Career Anchor date (default Sept 1) — "Time to build." |
| Adventure Today | Weekend hero — plan the day, lock in departure time |
| Long Effort | This week's big outdoor effort + WLW countdown |
| Family Day | Chase / Ada / Sylvia cards + age-appropriate spot suggestions |
| Project Session | Lowest-progress project + next milestone + hours before dinner |
| Week Ahead | Monday calendar, Run Club reminder, training targets |
| 50 Hikes | Progress tracker + seasonal suggestion + log completions |

### Morning Briefing
AI-generated daily briefing via Anthropic claude-sonnet-4-6 (server-side Edge Function only). Personal narrative ("About Ben") lives in `users.briefing_profile` JSONB — editable from a card on the Log page — so identity, current focus, health context, goals, and tone notes change without touching code. Anchor dates and family ages are pulled per request from `anchor_events` and `family_members`; the function pre-computes "days away" and injects them so the model never has to do date math. Weekday: recovery signals, mood, portfolio review, pilot light staleness — ends with one specific next action. Weekend: "What's the move?" voice — weather, family, recovery, no career urgency.

### Recovery Score
Composite score from RHR delta, sleep duration, drinks yesterday, and days since rest. Tiers: **Go Hard** (>80), **Moderate** (60–80), **Recovery** (<60). Confidence rating based on how many signals are available.

### MIT Framework
Four rotating categories — Family, Home, Career, Projects. MITs surface from the highest-neglected categories. Evening is protected, never colonized. Persistent reminders surface daily until done. The MIT widget computes the live 7-day completion rate from `daily_plans` review history with a ±vs-prior-week delta and a 5-day dot strip — not a literal.

### Inbox
Brain dump capture with floating action button on every screen. Zero categorization at capture. Morning triage routes items to: todo lists, MITs, reminders, project milestones, or delete.

### Todo Lists
Career, Family, and Home lists with three urgency levels: **Fire** (urgent), **On Deck** (soon), **Rain Day** (whenever). Drag-reorder within urgency groups.

### Training
Event cards for target races (FOCO Fondo, Ride the Hurricane, West Line Winder 30K). Weekly target vs actual tracking. Strava OAuth integration syncs recent activities.

### Projects
Active projects with milestones, progress percentage, next action, and update log. Weekend surfaces the lowest-progress active project for deep session work.

### 50 Hikes with Kids
Tracks progress through *50 Hikes with Kids: Colorado* (Gorton & Tillack). Surfaces a seasonal suggestion each weekend morning — prioritizes current-month hikes within 90 minutes of Denver. Tap to log completion with family star rating.

### Inspiration Widget
Adventure photos from Supabase Storage surfaced by date proximity — "5 years ago today." Tap to expand into full-screen swipe gallery. Reminds you who you are when "why bother" creeps in.

### Trends Report Card
A newspaper-style report card per metric (Weight, Body fat %, Miles run, Workouts, RHR, Drinks/day) with a 7-vs-14-day delta, a direction arrow, and an inline sparkline showing the recent shape. Race readiness ring up top — weighted blend of weekly mileage, longest run vs taper target, weekly consistency, and average recovery — countdowns to the West Line Winder anchor event.

### Dynamic Location
Geolocation snaps to a known place from a small `KNOWN_LOCATIONS` list (Denver, Howard) and labels propagate everywhere — weather widget, lock strip, morning hero stamp, trends masthead. Outside the radii, the label falls back to "Current location" rather than asserting somewhere wrong. HR-zone baselines stay calibrated for Denver elevation even when the rest of the UI shows Howard.

---

## Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript (strict) |
| Styling | Tailwind CSS + CSS custom properties |
| Backend / DB | Supabase (Postgres, Auth, Edge Functions, Storage, Realtime) |
| Deployment | Vercel (auto-deploy from `main`) |
| AI Briefing | Anthropic API — claude-sonnet-4-6, server-side only |
| Fitness | Strava OAuth2 — activity sync |
| Body Metrics | Withings OAuth2 — weight, body fat, muscle mass |
| Calendar | Google Calendar OAuth2 — read events |
| Health | Apple Health via Health Auto Export → Supabase webhook |
| Weather | OpenWeatherMap — geolocation-first, snaps to Denver / Howard, "Current location" fallback |

### Key Patterns

**Time-aware views** — `useTimeOfDay` (weekday) and `useDayType` / `getWeekendBlock` (weekend) drive which view component renders. Both share `MORNING_START_MINS = 6 * 60` so the before-dawn boundary stays consistent. Block overrides clear automatically when the real block transitions.

**Glass card system** — All widgets are `<Glass>` cards with a grain texture overlay, backdrop blur, and consistent border radius. Full-height inner wrapper ensures absolutely-positioned children (like photo widgets) fill the card.

**Supabase-first data** — All queries use the typed Supabase client. Partial selects cast explicitly via `as Promise<{ data: T[] | null }>`. Fire-and-forget mutations use `const db = supabase as any` to bypass PromiseLike constraints.

**Edge Functions** — `morning-briefing` (Anthropic API), `apple-health-webhook` (Health Auto Export), `strava-webhook`. Webhook functions deployed with `--no-verify-jwt`.

**RLS everywhere** — Row-level security on all tables from day one. Single-user v1 but multi-tenant ready — all policies use `auth.uid() = user_id`.

### Database Schema (key tables)
- `users` — includes `briefing_profile` JSONB (identity, focus, health context, goals, tone notes, weekend identity)
- `activities` — unified Strava + manual workouts
- `body_metrics` — Withings weight / body fat / muscle mass
- `recovery_signals` — daily RHR, sleep, drinks, steps, mood (1–5) from Apple Health + in-app
- `program_tracker` — current strength program position
- `daily_plans` — day review, MIT completion, weekday + weekend briefing cache
- `todos` — career/family/home with urgency
- `inbox_items` — capture queue
- `inspiration_photos` — adventure photos with Supabase Storage
- `training_goals` + `training_weeks` — event targets and weekly actuals
- `projects` + `project_milestones` — active projects
- `oauth_tokens` — Strava, Withings, Google OAuth tokens
- `hikes_50` — 50 Hikes with Kids tracker (done, rating, notes per hike)
- `weekend_plans` — one-row-per-day adventure planning
- `weekend_spots` — curated family/adventure destinations
- `family_members` — Ben/Tangier + 3 kids (birthdays, role, emoji, vibe) — source of truth for kid ages
- `anchor_events` — race day + Career Anchor with stable slugs (`wlw`, `labor_day`); editable in app

---

## Roadmap

**What's left** (in rough priority order):

1. **Historic import** — full Strava backfill beyond the 90-day window, Peloton CSV importer, weight CSV importer.
2. **Polish pass** — mobile empty states for cold-start users, consistent event countdowns, mobile keyboard handling on long forms.
3. **Briefing dispatch** — schedule the morning-briefing Edge Function via cron + push notification, instead of generating on app open.
4. **Server-side dynamic location** — the weekend briefing weather call still hardcodes Denver lat/lon. Pass current coords from the client (or store the latest resolved location in `users`) so the briefing uses the same place the rest of the UI shows.

---

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.

# Start dev server
npm run dev

# Sync adventure photos to Supabase Storage
# Drop JPEGs into public/photos/inspirations/ first
npm run sync-photos
```

### Environment Variables
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / VITE_STRAVA_REDIRECT_URI
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / VITE_GOOGLE_REDIRECT_URI
VITE_OPENWEATHER_API_KEY
ANTHROPIC_API_KEY          # server-side Edge Function only — never expose to client
```

---

*Built by Ben Wright with AI-assisted engineering — Claude Code + Ben Wright*
*West Line Winder 30K · Sept 26, 2026 · Buena Vista, CO*
