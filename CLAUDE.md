# adadv3nture

> "a dad adventure" — mission control for my life.

One place where career, family, home, body, and personal projects all live together.
Every morning it surfaces my Most Important Tasks — not what's loudest, what actually moves the needle.

**Reference docs:** [design-system](docs/design-system.md) · [schema](docs/schema.md) · [intelligence](docs/intelligence.md) · [user-context](docs/user-context.md) · [reference](docs/reference.md)

---

## Current Session Goal

_Update this at the start of every Claude Code session._

```
NEXT PRIORITY: Withings OAuth — connect, sync body metrics, weight trend
```

---

## What's Live (as of May 10, 2026)

**Migrations applied:** 001–022 · **Deployed:** https://adadv3ntures.vercel.app/ (Vercel auto-deploy from main)

| Area | Status |
|------|--------|
| Auth (Supabase email + Google) | ✓ |
| Widget grid — time-aware (morning/mid/afternoon/evening) | ✓ |
| Morning briefing (Anthropic claude-sonnet-4-6, Edge Function) | ✓ |
| Recovery score + tier (go_hard/moderate/recovery) | ✓ |
| Program tracker — Total Strength prescription + Strava sync | ✓ |
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
| Withings OAuth + body metrics | ✗ |
| Trends engine — charts, weekly summaries | ✗ |
| Daily check-in — mood, MIT portfolio check | ✗ |

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
2. **GLP-1** — 7-day rolling weight averages. Muscle mass % is the primary metric.
3. **Drinks = ratio not streak** — `drinks_consumed integer`. Goal ≤ 2.0/day avg.
4. **Labor Day Sept 1 2026** — career block non-negotiable. Show countdown.
5. **Run Club sacred** — Monday evenings, Wash Park. Never override.
6. **4pm is the critical hour** — weather-appropriate project slot.
7. **Program tracker = prescription only** — Strava logs actuals.
8. **Inbox = zero friction** — FAB always visible, zero categorization at capture.
9. **Evening is protected** — never colonize it with MITs.
10. **West Line Winder = anchor event** — Sept 26, Buena Vista. Howard runs = race training.
11. **MIT completion rate = meta-metric** — more important than any single fitness number.
12. **Wright Adventures = the meaning** — Labor Day: WA income or get a real job.

---

## Build Order

```
✓ 01. Project init — Vite + React 19 + TypeScript + Tailwind + Supabase
✓ 02. Schema — migrations 001-022, RLS, seed data
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

  09. Withings OAuth — connect, sync metrics, weight trend  ← NEXT
  10. Daily check-in — drinks +/- counter, mood
  18. Trends engine — weekly summaries, report card, charts
  20. Historic import — Strava backfill, Peloton CSV, weight CSV
  21. Polish — mobile empty states, event countdowns
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

*Last updated: May 10, 2026*
