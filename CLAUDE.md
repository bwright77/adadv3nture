# adadv3nture

> "a dad adventure" — mission control for my life.

One place where career, family, home, body, and personal projects all live together.
Every morning it surfaces my Most Important Tasks — not what's loudest, what actually moves the needle.

**Reference docs:** [design-system](docs/design-system.md) · [schema](docs/schema.md) · [intelligence](docs/intelligence.md) · [user-context](docs/user-context.md) · [reference](docs/reference.md)

---

## Current Session Goal

_Update this at the start of every Claude Code session._

```
NEXT PRIORITY: Live-test the WLW training system end to end — MIT cadence
              framework (per-category intervals, no aggregate %), Row Bootcamp
              strength template (2× target / 3× stretch), and the swap-aware
              WTomorrow engine. Watch the morning briefing for a week to
              confirm it reads cadence + TRAINING WEEK prescription correctly.
              Still open: Apple Health Shortcut sleep filter (server clamps
              >12h/<30m as defense; Shortcut UI can't dedupe overlapping
              samples cleanly).
```

---

## What's Live (as of May 29, 2026)

**Migrations applied:** 001–037 · **Deployed:** https://adadv3ntures.vercel.app/ (Vercel auto-deploy from main) · **Edge Functions deploy via** `npx supabase functions deploy <name>` (or `--no-verify-jwt` for webhooks; pinned in `supabase/config.toml`)

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
| 50 Hikes with Kids tracker — seasonal suggestion, log, expanded list | ✓ |
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

- **Gartner maturity order:** Descriptive → Diagnostic → Predictive → Prescriptive. Don't skip layers.
- **MITs from data:** what matters today is output of neglect score + deadline pressure + recovery signals.
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
10. **West Line Winder = anchor event** — Sept 26, Buena Vista (18.6mi / ~4,200ft). Bergen Peak HM (Aug 22) is the key predictor. The 19-week plan is the body goal.
11. **MIT cadence > completion %** — each category has its own expected interval (career 3 / family 2 / home 5 / projects 5 days). Goal is forward motion, not uniform daily quota. Flag DARK (past interval); never aggregate into a single %.
12. **Career is weekday-only** — empty Career on Sat/Sun is by design; cadence counts weekday gaps only.
13. **Bike ✗ if wet recently or forecast-today wet** — not just "currently raining." Running in the rain is fine (runOk is temperature-only).
14. **Wright Adventures = the meaning** — Labor Day: WA income or get a real job.

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

*Last updated: May 29, 2026*
