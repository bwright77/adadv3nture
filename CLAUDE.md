# adadv3nture

> "a dad adventure" — mission control for my life.

One place where career, family, home, body, and personal projects all live together.
**The point of the app is to collect me** — gather the scattered signal of a life and reflect back where I'm diverging from where I meant to go. Every morning it surfaces the single highest-leverage move — not what's loudest, what actually moves the needle.

**Reference docs:** [philosophy](docs/philosophy.md) · [design-system](docs/design-system.md) · [schema](docs/schema.md) · [intelligence](docs/intelligence.md) · [user-context](docs/user-context.md) · [reference](docs/reference.md)

---

## Philosophy — what the app is for

> Durable framing, not a build spec. Full version: [docs/philosophy.md](docs/philosophy.md). Check features against it, not the reverse.

**The premise: "my life in one place" — the point is to collect me.** Where am I, what are my goals, my must-dos, what am I losing track of? It is **not** a goal-achievement app, **not** a tracker that needs feeding, **not** a gate/timesheet/wall-on-open, **not** a guilt machine.

**Collection layer (the substrate):** most of "collecting me" is passive — Strava → training, Withings → biometrics, Apple Watch → sleep/recovery, todo check-offs → category activity. **Mood is the one true subjective entry.** Two rules: (1) **time-agnostic entry** — every entry carries the date it's *about*, not when it was made; any signal, any prior day, no "catching up"; (2) **accrete, don't replace** — each source writes only its own slice; logging Friday's mood on Sunday adds to Friday, never clobbers the run/weight/sleep already there. **Completeness, not enforcement** — missing mood flags a day as needing a fill; the fill is an invitation ("you forgot Friday, here's Friday"), not a wall.

**Two faculties read the same data in opposite directions:**
- **The Watcher** (backward / diagnostic) — detects dimming, nudges, quiet until needed. Guards only what *degrades life right now if it slips*: Career/WA runway (hard Sept 1 reckoning, cannot slip) and Training-as-energy (nudge a skipped run as **care** — "you feel better when you move" — never **debt**). Everything else is tracked-but-silent; categories may dim in a demanding season without that being failure.
- **The Suggester** (forward / generative) — the front door; proposes the next move and works on good days *and* bad. Adventure card, next training session, inspiration photos, aspirational nudges. On an easy day the watcher is silent and the suggester still offers — the reassurance that nothing's quietly fading is itself a feature.

**Pilot lights = the universal abstraction.** Each category computes "lit vs. dimming" from whatever it's made of, reports one flame. **Drift is just a dimming pilot light** — not a separate feature.

**Goals = three stacked positives:** (1) *setting* the goal is a good in itself; (2) *training toward it* is good in the doing; (3) *completing it* is the cherry — the best part, but a topping on two layers that already stood alone. A miss removes the cherry, not the cake. This splits goals into two kinds treated **oppositely**:
- **Operational** — real consequences (WA progress; the bike show). The watcher guards these; slipping is real, tell me.
- **Aspirational** — shared family dreams (family hikes, a park a month, National Parks). The suggester feeds them; progress shows as **delight, not pace**; the watcher **never nags** them. Letting them breathe is correct use.
- The tell: missing it has a *consequence* → operational; just a *someday* → aspirational.
- **WLW is aspirational wearing operational clothing** — the date/plan are scaffolding for the training; the training still gets nudged, as energy/care, not race-debt.

**The briefing names "the one thing" as editorial, not structure** — a valuable daily opinion, an output. The briefing names one; the system tracks all.

---

## Current Session Goal

_Update this at the start of every Claude Code session._

```
NEXT PRIORITY: Live-test Summer Mode v1 (migrations 039–041; auto-active now,
              Jun 2–Aug 26). Above the time grid: a FireBanner (fire todos
              interrupt) + the Adventure-of-the-Day hero (week-type toggle
              Solo/Camp/Weekend lives in the hero, not the Header) + WA week-ring
              (career_done-derived) + season heat-map. Adventure is delight-only
              (got-out dot + weekly real-adventure star; NO nag). Watcher narrows
              to Fire+WA+Training INTERRUPTS only — pilot lights stay VISIBLE.
              Briefing gains summer-solo/camp/weekend voices, server-derived from
              users.summer_week_type. Confirm: catalog seeded from
              weekend_spots+hikes_50; hero suggests by place/weather; logging
              lights the heat-map + registers family MIT; "normal day ›" exits to
              the standard dashboard. Deferred: v2 scoring, multi-day backfill.
              Still open: Apple Health Shortcut sleep filter.
```

---

## What's Live (as of Jun 3, 2026)

**Migrations applied:** 001–048 · **Deployed:** https://adadv3ntures.vercel.app/ (Vercel auto-deploy from main) · **Edge Functions deploy via** `npx supabase functions deploy <name>` (or `--no-verify-jwt` for webhooks; pinned in `supabase/config.toml`)

| Area | Status |
|------|--------|
| Auth (Supabase email + Google) | ✓ |
| Widget grid — time-aware (morning/mid/afternoon/evening) | ✓ |
| Morning briefing (Anthropic claude-sonnet-4-6, Edge Function) | ✓ |
| Recovery score + tier (go_hard/moderate/recovery) | ✓ |
| Strength template — Row Bootcamp (2×/wk target, 3× stretch); Total Strength retired but history kept | ✓ |
| Inbox — FAB capture + swipe triage (left=delete, right=MIT) | ✓ |
| Todo lists — career/family/home, urgency fire/deck/rain | ✓ |
| Persistent reminders | ✓ |
| Training tab — FOCO Fondo, Hurricane Ridge, WLW + weekly targets | ✓ |
| Projects tab — milestones, contacts, image/url/progress editing | ✓ |
| Career tab — opportunity cards with contacts | ✓ |
| Inspiration widget — Supabase storage, "on this day", swipe ±4 days | ✓ |
| Photo backgrounds — seasonal home, hero gradient secondary pages | ✓ |
| Weather widget | ✓ |
| Strava OAuth — connect + 90-day backfill into activities table | ✓ |
| Google Calendar — WCalendar widget, "Connect" OAuth button | ✓ |
| Apple Health — iOS Shortcut → Edge Function → recovery_signals | ✓ |
| Drinks widget — +/- counter, 7-day avg | ✓ |
| Weekend Mode — 4 views (Dawn/Day/Sat Eve/Sun Eve), weekend briefing variant | ✓ |
| MIT routing fix + Home split — projects never credit Home (only career-tagged → Career; all else → Projects; migration 044 retired the 'home' project category, FJ62→other). FJ62 truck (Elsie) re-homed from ~16 Home todos into the FJ62 project as milestones (migration 045, find-or-create). Home category split across two houses via `todos.home_site` (`birch`=Birch St/Denver primary, `yellow_house`=Yellow House/Howard; migration 046) — context-aware filter chips on the Home tab default to current location (`siteForSlug`), per-row house tag, add-todo defaults to current house. Home stays ONE pilot light | ✓ |
| Strava streams — `src/lib/strava-streams.ts` pulls per-second HR/pace/altitude streams per activity (migration 043 `activity_streams`), derives HR time-in-zone (Karvonen Z1–5, RHR 63/MHR 191) + aerobic decoupling (speed-per-beat drift, >5% = fading durability for WLW). `enrichRecentStreams()` runs fire-and-forget after a manual Strava sync, capped + throttled (resumes on 429). Data persisted; not yet surfaced in UI | ✓ |
| Family Hikes tracker (formerly "50 Hikes"; migration 042 renamed `hikes_50`→`family_hikes`, `use50Hikes`→`useFamilyHikes`, `W50Hikes`/`Hikes50View`→`WFamilyHikes`/`FamilyHikesView`) — an **open, aspirational collection** of hikes done together (no book-50 goal, no completion ring — delight not pace, never nagged). The original 50 + family-added hikes (＋ Add a hike, `is_custom` flag, nullable `book_number`) all live as one flat list; book/custom distinction is no longer surfaced in the UI. Count of hikes done + seasonal suggestion, log, expanded list. The 50 seeded rows remain only as a library of suggestion ideas | ✓ |
| Withings OAuth + body metrics — connect + sync to body_metrics, weight/body-fat in trends | ✓ |
| Trends engine — report card rows + weekly_summaries Edge Function + per-row sparklines | ✓ |
| MIT cadence framework — per-category intervals (career 3 / family 2 / home 5 / projects 5 days, in `briefing_profile.category_cadence_days`); LIT/DARK not % completion | ✓ |
| MIT auto-registration — milestone check / opportunity-update / todo-complete / hike-log auto-fill the matching MIT row | ✓ |
| Career weekday-only — Sat/Sun empty Career is by design, excluded from cadence math | ✓ |
| Family source of truth — `family_members` (Ben/Tangier + 3 kids, birthdays → computed ages) | ✓ |
| Anchor events — `anchor_events` (WLW + Career Anchor), editable in Career panel | ✓ |
| Dynamic location — snap to Denver / Howard from geolocation; falls through to Denver | ✓ |
| Morning briefing — anchor/family/profile-driven prompt (no hardcoded dates or narrative) | ✓ |
| Briefing voice editor — Log page card edits `users.briefing_profile` JSONB | ✓ |
| Mood entry — emoji-face row (😭😢😐🙂😄) in WReview, writes `daily_plans.mood_score`; briefing reads it | ✓ |
| Polish pass — mobile empty states, event countdowns, mobile keyboard handling | ✓ |
| Briefing dispatch — Apple Health webhook chains briefing + sends push (VAPID keys set) | ✓ |
| Smart trainer — `deriveTrainingWeek()` computes weekly targets from upcoming events; manual override still available | ✓ |
| Editable opportunity deadlines — tap soft/deadline pills in Career → inline date picker | ✓ |
| Anchor deep-link — Trends anchor card → linked `training_goal` EventDetail in Training tab | ✓ |
| Data export — Log page ◆ EXPORT downloads a Markdown brief for upload into a Claude conversation | ✓ |
| Trends auto-refresh — Strava / Withings sync bumps a `dataVersion` so TrendsPage refetches without remount | ✓ |
| Health webhook hardening — sleep clamp (>12h or <30m → null), force-regenerate briefing on each sync | ✓ |
| Morning auto-sync — Apple Health webhook chains Strava + Withings sync before the briefing fires (no more manual Sync taps) | ✓ |
| Steps backfill — Shortcut sends `steps_history` (last N days) so a missed firing self-heals | ✓ |
| Withings body comp — visceral fat, vascular age, pulse wave velocity, BMR; one row per weigh-in (migration 031 collapsed splits) | ✓ |
| Weight de-emphasized — observational only; body goal is training-driven (WLW), no "lbs to target" framing anywhere | ✓ |
| Trends — "Miles ridden" report-card row; readiness card taps through to the training plan | ✓ |
| 19-week WLW training program — inline on Training tab: phase-colored hero, dual-view report card, weekly templates, quality streams, strength progression, trail rotation, principles (all in `training_weeks` + `training-templates.ts`) | ✓ |
| WTomorrow — template-lead, swap-aware recommendation (credits a mid-week long run against Saturday's slot; recovery + weather overrides) | ✓ |
| Briefing TRAINING WEEK block — feeds the current plan week's phase / targets / quality + strength prescription into the model | ✓ |
| Editable training events — name/date/type/location/distance/elevation/start-time inline on EventDetail | ✓ |
| Timezone hardening — `logicalToday()` (America/Denver) everywhere; no UTC date-rollover bugs | ✓ |
| Auth — `user` reference memoized by id so TOKEN_REFRESHED on tab-focus doesn't remount forms / wipe in-progress input | ✓ |
| FIBArk 10K tune-up — Jun 21 trail race (migration 038); race-pace targets (`src/lib/raceTargets.ts`) surface a pace-breakdown card on EventDetail (FIBArk / Bergen / WLW) | ✓ |
| Week character taxonomy — `src/lib/weekCharacter.ts` computes Build / Recovery / Race / Taper from phase + key_marker + race-in-week; UI leads with "PHASE · character", week numbers demoted to metadata (hero, week rows, briefing header) | ✓ |
| Thursday outdoor-quality rotation — `src/lib/thursdayRotation.ts` 4-week cycle (cruise → strides → tempo → race-pace intervals), pointer derived from completed Thursday runs, phase-gated to BASE/BUILD, race/recovery/taper overrides; Peloton class recs + Strava-sync warning on the Training tab card + WTomorrow | ✓ |
| Summer Mode v1 (migrations 039–041; auto-active Jun 2–Aug 26) — re-weights the dashboard: a summer band above the time grid with FireBanner (fire todos interrupt any day) + Adventure-of-the-Day hero (`adventures` catalog seeded from weekend_spots/hikes_50; place/weather-aware suggester in `src/lib/adventures.ts`) + WA week-ring (`getWAWeekProgress`, career_done-derived) + season heat-map. Week-type Solo/Camp/Weekend (`users.summer_week_type`, toggle in the hero) re-weights the band + the briefing voice (summer-solo/camp/weekend, server-derived). Adventure is delight-only (got-out dot + weekly real-adventure star, no nag); pilot lights stay visible. Relief gradient on `src/lib/locations.ts` (Howard=grandparents, Greeley/Evans=in-laws, Denver=home, camp=free) | ✓ |

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite + TypeScript strict |
| Backend | Supabase (Postgres, Auth, Edge Functions) |
| Deployment | Vercel |
| AI | Anthropic claude-sonnet-4-6 (Edge Function only) |
| Fitness | Strava OAuth2 |
| Body Metrics | Withings OAuth2 |
| Calendar | Google Calendar API |
| Weather | OpenWeatherMap |
| Health | Apple Health Auto Export webhook |
| Styling | Tailwind + CSS variables (`src/tokens.ts`) |

---

## Architecture Principles

- **Collect me, don't gate me:** the app gathers scattered signal and reflects back drift — never a tracker-to-feed, timesheet, or wall-on-open. See [Philosophy](#philosophy--what-the-app-is-for).
- **Watcher vs Suggester:** every feature is one or the other. Watcher = backward/diagnostic, guards only what degrades life now (Career runway, Training-as-energy), quiet otherwise. Suggester = forward/generative front door, offers on good days *and* bad.
- **Accrete, don't replace; time-agnostic entry:** each source writes only its own slice of a day; entries carry the date they're *about*. Logging a past day adds, never clobbers. No "catching up."
- **Pilot lights are the abstraction:** each category reports "lit vs. dimming" as one flame. Drift is a dimming pilot light, not a separate feature.
- **Operational vs aspirational goals:** consequence → operational (watcher guards). Someday → aspirational (suggester feeds, delight not pace, never nag).
- **Gartner maturity order:** Descriptive → Diagnostic → Predictive → Prescriptive. Don't skip layers.
- **MITs from data:** what matters today is output of neglect score + deadline pressure + recovery signals; the briefing names one as editorial, the system tracks all.
- **Time-aware UI:** same data, different hero widget by time of day.
- **Graceful degradation:** never crash on nulls. Missing signals fall back with uncertainty flagged.
- **Single user v1, RLS from day one** — multi-tenant is a refactor not a rewrite.
- **One tear-down rule:** like the FJ62 — do all related work in one session.
- **No secrets in code:** all keys in `.env.local`, never committed.
- **Remote Supabase only:** never `supabase start`. Use `npx supabase db push` for migrations.

---

## Key Domain Rules

1. **Elevation** — HR zones for Denver 5,318ft. Sea level = ~8bpm higher. Flag when traveling.
2. **Weight is observational, not a goal** — body goal is training-driven (WLW + the 19-week plan). Reference RHR / recovery / sleep / training volume for body status, never "lbs to target." GLP-1 since Nov 2024; muscle mass % more interesting than weight.
3. **Drinks = ratio not streak** — `drinks_consumed integer`. Goal ≤ 2.0/day avg.
4. **Labor Day Sept 1 2026** — career block non-negotiable. Show countdown. This is the [CAREER] anchor — never conflate with weight or training.
5. **Run Club sacred** — Monday evenings, Wash Park. Never override.
6. **4pm is the critical hour** — weather-appropriate project slot.
7. **Strength = Row Bootcamp** (Total Strength retired) — 2×/wk target, 3× stretch. Detection matches `/strength|bootcamp/i`. Strava logs actuals.
8. **Inbox = zero friction** — FAB always visible, zero categorization at capture.
9. **Evening is protected** — never colonize it with MITs.
10. **West Line Winder = anchor event** — Sept 26, Buena Vista (18.1mi / 2,450ft gain; high 8,530 / low 7,930 / avg 8,260). Bergen Peak HM (Aug 22, "Bergen Peak Half Marathon" — 13.1mi / 2,451ft) is the key predictor and a `training_goals` row. The 19-week plan is the body goal. Race events carry a `commitment` (locked/conditional/aspirational); Ride the Hurricane is **conditional** — lower-prominence "MAYBE" in the Training tab, never nagged.
11. **MIT cadence > completion %** — each category has its own expected interval (career 3 / family 2 / home 5 / projects 5 days). Goal is forward motion, not uniform daily quota. Flag DARK (past interval); never aggregate into a single %.
12. **Career is weekday-only** — empty Career on Sat/Sun is by design; cadence counts weekday gaps only.
13. **Bike ✗ if wet recently or forecast-today wet** — not just "currently raining." Running in the rain is fine (runOk is temperature-only).
14. **Wright Adventures = the meaning** — Labor Day: WA income or get a real job.
15. **Week label = phase + character, not number** — lead with "BUILD · FIBArk race week" / "BASE · Recovery week". Character is computed (`weekCharacter.ts`), never stored. Week numbers are metadata only (URLs, plan view, analytics) — never on the daily surfaces, briefing header, or workout cards.
16. **Thursday = outdoor quality rotation** — cruise → strides → tempo → race-pace intervals, advancing on completed Thursday runs (not calendar). Only governs BASE/BUILD; PEAK/TAPER Thursdays stay easy. Race weeks skip it. WLW sustained pace (11:00–11:30/mi) is the primary tempo/interval reference. Peloton Outdoor classes don't auto-sync to Strava — record with the watch.
17. **FIBArk 10K (Jun 21) = tune-up, not anchor** — fitness benchmark on the road to Bergen (Aug 22) and WLW (Sep 26). `role` framing lives in notes (no `role` column). Target 56–58 min.
18. **Summer Mode (Jun 2–Aug 26) re-weights, never hides** — auto-active on date; "normal day ›" in the hero overrides off. Adventure on top, structure underneath. Watcher narrows what may **interrupt** to Fire + WA(5×/wk) + Training only; **pilot lights stay visible** (Family/Home tracked-but-silent ≠ hidden — see memory). Adventure is delight-only, never nagged (got-out dot + weekly real-adventure star; missed week = unlit cell, never a reset, à la drinks-ratio). Week-type (`users.summer_week_type`) is Sunday-set and persists (no auto-clear); the briefing reads it server-side.

---

## Build Order

```
✓ 01. Project init — Vite + React 19 + TypeScript + Tailwind + Supabase
✓ 02. Schema — migrations 001-037, RLS (full coverage after 029 fix), seed data
✓ 03. Auth — email + Google OAuth
✓ 04. Widget grid — time-aware views
✓ 05. Inbox — FAB, swipe triage
✓ 06. Todo lists — career/family/home, urgency, drag reorder
✓ 07. Persistent reminders
✓ 08. Strava OAuth — connect + 90-day backfill
✓ 11. Google Calendar — OAuth, WCalendar widget
✓ 12. Apple Health webhook
✓ 13. Recovery score — compute, display tier + confidence
✓ 14. Program tracker — Total Strength + Strava sync
✓ 15. Daily plan + thinking prompt
✓ 16. Morning briefing — Anthropic, Edge Function
✓ 17. Weather widget
✓ 19. Inspiration widget — storage, on this day, swipe
  +. Training tab, Projects tab, Career tab, design system
✓ WM. Weekend Mode — 4 views, 8 widgets, briefing variant, 50 Hikes tracker
✓ 09. Withings OAuth — connect, sync metrics, weight + body-fat in trends
✓ 10. Daily check-in — mood entry (1–5 in WReview, drinks +/- already live)
✓ 18. Trends engine — sparkline charts, report card rows, weekly_summaries function
✓ 23. Server-side dynamic location — client passes coords; weekend WEATHER + weekday LOCATION lines reflect actual place

✓ 21. Polish — mobile empty states, event countdowns, mobile keyboard
✓ 22. Briefing dispatch — Apple Health webhook chains briefing + sends push notification
✓ 24. Smart trainer — auto-derive weekly targets from upcoming training_goals
✓ 25. Anchor deep-link — Trends → Training EventDetail via `training_goal_id` FK
✓ 26. Data export — Markdown brief for Claude analysis
✓ 28. MIT auto-registration — milestones / updates / todos / hikes auto-fill the matching MIT row
✓ 29. MIT cadence framework — per-category intervals replace the aggregate % completion metric
✓ 30. Weight de-emphasis — observational only; body goal = training-driven (WLW)
✓ 31. Withings depth — visceral fat / vascular age / PWV / BMR; one-row-per-weigh-in; refresh action fix
✓ 32. Morning auto-sync — webhook chains Strava + Withings before the briefing
✓ 33. 19-week WLW training program — inline Training-tab section + briefing TRAINING WEEK feed
✓ 34. Strength template — Row Bootcamp replaces Total Strength (2× / 3× stretch)
✓ 35. WTomorrow — template-lead, swap-aware recommendation engine
✓ 36. Timezone hardening — logicalToday() everywhere; stable auth user reference
✓ 37. Training-plan consolidation — FIBArk 10K (migration 038) + race-pace targets card; week character taxonomy (phase + character, numbers demoted); Thursday outdoor-quality 4-week rotation (activity-derived, phase-gated)
✓ 38. Summer Mode v1 — seasonal re-weighting (migrations 039-041): adventure catalog + two-tier log + heat-map, summer band (fire interrupt + adventure hero + WA ring), week-type Solo/Camp/Weekend, summer briefing voices. Deferred: v2 suggester scoring, v3 learns-from-logs, multi-day backfill
✓ 39. Philosophy follow-ups + Family Hikes — cross-day backfill (getOpenDays + WBackfill on Log page), WLW banked-miles reframe, weekend-plan logicalToday() fix; "50 Hikes" → "Family Hikes" full rename (migration 042) with family-added custom hikes (＋ Add a hike) picker

  27. Apple Health sleep filter — Shortcut still over-counts; webhook clamps as defense  ← OPEN
```

---

## Wright Adventures

**Active proposals:**
- PeopleForBikes (Jenn Dice, CEO) — AI/BIDE intelligence layer · $50-85K
  Jenn replied May 6: data team call invited. José + Liam on thread.
  Next: reply to Jenn, confirm call with data team.

**Job targets:** Coforma (Principal Product Engineer) · Change Research · Murmuration · Skylight

**Fractional CTO:** $5-8K/month × 2-3 clients. JD + AI tooling + 30yr dev.

**Brand:** wrightadventures.org · Summit Navy #004667 · River Blue #009DD6 · Earth Orange #B44B00

---

*Last updated: Jun 2, 2026*
