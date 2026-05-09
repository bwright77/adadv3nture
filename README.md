# adadv3nture

> "a dad adventure" — mission control for a life in motion.

Three kids. A startup on the clock. A 30K trail race in September. A body that's been through some things and is coming back anyway.

**adadv3nture** is a personal OS built for one person who doesn't have time to wonder what he should be doing next. It pulls from every signal — recovery, sleep, drinks, steps, weather, calendar, training load, what's been neglected — and surfaces one honest answer: *here's what today looks like, here's what matters, go.*

No productivity theater. No streaks. Just the data, the plan, and the door.

---

## Features

### Time-Aware Dashboard
The home screen surfaces different widgets based on time of day — same data, different hero. Four modes: **Morning** (7:35–9:30am), **Mid-Morning** (9:30am–2:30pm), **Afternoon** (2:30–6pm), **Evening** (6pm+). Time-of-day can be manually overridden from the header.

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
| Calendar | Today's events from Google Calendar |
| Forecast | 5-day forecast with activity recommendations |
| MITs | Most Important Tasks with checkbox triage |
| Inbox | Unprocessed capture count + quick entry |
| On This Day | Adventure photo from this date in past years |
| Pilot Lights | Days since last activity per life category |
| Day Review | Evening check-in for each life portfolio category |
| Tomorrow | Next day workout + weather + focus areas |
| Labor Day | Countdown to fish-or-cut-bait date for Wright Adventures |

### Morning Briefing
AI-generated daily briefing via Anthropic claude-sonnet-4-6 (server-side Edge Function only). Pulls recovery signals, yesterday's portfolio review, and pilot light staleness. Direct, warm, specific — never generic wellness-app copy.

### Recovery Score
Composite score from RHR delta, sleep duration, drinks yesterday, and days since rest. Tiers: **Go Hard** (>80), **Moderate** (60–80), **Recovery** (<60). Confidence rating based on how many signals are available.

### MIT Framework
Five life portfolio categories — Family/Creative, Home, Financial, Personal, Mind. MITs surface from the highest-neglected categories. Mind is protected, never assigned. Persistent reminders surface daily until done.

### Inbox
Brain dump capture with floating action button on every screen. Zero categorization at capture. Morning triage routes items to: todo lists, MITs, reminders, project milestones, or delete.

### Todo Lists
Career, Family, and Home lists with three urgency levels: **Fire** (urgent), **On Deck** (soon), **Rain Day** (whenever). Drag-reorder within urgency groups.

### Training
Event cards for target races (FOCO Fondo, Ride the Hurricane, West Line Winder 30K). Weekly target vs actual tracking. Strava OAuth integration syncs recent activities.

### Projects
Active projects (Bottle Cap Bike, adadv3nture) with milestones, progress percentage, next action, and update log.

### Inspiration Widget
Adventure photos from Supabase Storage surfaced by date proximity — "5 years ago today." Tap to expand into full-screen swipe gallery. Reminds you who you are when "why bother" creeps in.

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
| Calendar | Google Calendar OAuth2 — read events |
| Health | Apple Health via Health Auto Export → Supabase webhook |
| Weather | OpenWeatherMap — geolocation-first, Denver fallback |

### Key Patterns

**Time-aware views** — `useTimeOfDay` drives which view component renders. `useBgPhoto` picks a seasonal photo for the background each period. Time-of-day override clears automatically when the real block transitions.

**Glass card system** — All widgets are `<Glass>` cards with a grain texture overlay, backdrop blur, and consistent border radius. Full-height inner wrapper ensures absolutely-positioned children (like photo widgets) fill the card.

**Supabase-first data** — All queries use the typed Supabase client. Partial selects cast explicitly via `as Promise<{ data: T[] | null }>`. Fire-and-forget mutations use `const db = supabase as any` to bypass PromiseLike constraints.

**Edge Functions** — `morning-briefing` (Anthropic API), `apple-health-webhook` (Health Auto Export), `strava-webhook`. Webhook functions deployed with `--no-verify-jwt`.

**RLS everywhere** — Row-level security on all tables from day one. Single-user v1 but multi-tenant ready — all policies use `auth.uid() = user_id`.

### Database Schema (key tables)
- `activities` — unified Strava + manual workouts
- `recovery_signals` — daily RHR, sleep, drinks, steps from Apple Health
- `program_tracker` — current strength program position
- `daily_plans` — day review, MIT completion, morning briefing cache
- `todos` — career/family/home with urgency
- `inbox_items` — capture queue
- `inspiration_photos` — adventure photos with Supabase Storage
- `training_goals` + `training_weeks` — event targets and weekly actuals
- `projects` + `project_milestones` — active projects
- `oauth_tokens` — Strava, Google OAuth tokens

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
