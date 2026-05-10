# adadv3nture — Weekend Mode

> Weekdays = optimization. Weekends = expansion.

Weekday app surfaces what the system says you should do. Weekend app surfaces what the day could become. Less prescriptive, more permissive. Less neglect-scoring, more "what's the move."

---

## Time Blocks

Weekdays have four blocks anchored to institutional time (school dropoff, WA block, pickup, dinner). Weekends don't have those rails — they have a slower start, a long unstructured middle, and a wind-down. Three blocks fit the shape.

| Block | Key | Time | Sub-label |
|---|---|---|---|
| Dawn | `weekend-dawn` | 6:00–9:00 | SLOW START · COFFEE · KIDS |
| Day | `weekend-day` | 9:00–17:00 | THE MOVE · BIG EFFORT |
| Evening (Sat) | `weekend-evening-sat` | 17:00+ | DINNER · LOG · WIND DOWN |
| Evening (Sun) | `weekend-evening-sun` | 17:00+ | PREP · WEEK AHEAD · RUN CLUB TOMORROW |

Sunday evening is distinct: it shifts from weekend-mode back toward weekday-prep. Surfaces the week ahead, Run Club reminder, WA priorities for Monday morning. Same visual shell, different content.

The `weekend-day` block is intentionally wide (8 hours). You might leave for a long ride at 9 and not be back until 2 — the app stays consistent the whole time. No artificial mid-block transition telling you to switch gears. Hero is static within the block.

---

## Architecture

### `useDayType()` hook

New sibling hook to `useTimeOfDay`. Returns `'weekday' | 'weekend'` with override support mirroring the existing `todOverride` pattern.

```typescript
export type DayType = 'weekday' | 'weekend'
export type WeekendBlock = 'weekend-dawn' | 'weekend-day' | 'weekend-evening-sat' | 'weekend-evening-sun'

function getDayType(date: Date): DayType {
  const dow = date.getDay()
  return (dow === 0 || dow === 6) ? 'weekend' : 'weekday'
}

function getWeekendBlock(date: Date): WeekendBlock {
  const mins = date.getHours() * 60 + date.getMinutes()
  const isSunday = date.getDay() === 0
  if (mins < 9 * 60) return 'weekend-dawn'
  if (mins < 17 * 60) return 'weekend-day'
  return isSunday ? 'weekend-evening-sun' : 'weekend-evening-sat'
}
```

Override exposed in Header — same UX as the existing `tod` override. Manual override persists until the block naturally transitions. `dayTypeOverride` also supported (e.g. traveling on Wednesday, want weekend mode).

### Routing in `App.tsx`

```typescript
{tab === 'home' && dayType === 'weekday' && tod === 'morning'     && <MorningView ... />}
{tab === 'home' && dayType === 'weekday' && tod === 'mid-morning' && <MidMorningView ... />}
{tab === 'home' && dayType === 'weekday' && tod === 'afternoon'   && <AfternoonView ... />}
{tab === 'home' && dayType === 'weekday' && tod === 'evening'     && <EveningView ... />}

{tab === 'home' && dayType === 'weekend' && wb === 'weekend-dawn'        && <WeekendDawnView ... />}
{tab === 'home' && dayType === 'weekend' && wb === 'weekend-day'         && <WeekendDayView ... />}
{tab === 'home' && dayType === 'weekend' && wb === 'weekend-evening-sat' && <WeekendEveningView ... />}
{tab === 'home' && dayType === 'weekend' && wb === 'weekend-evening-sun' && <WeekendSundayEveningView ... />}
```

### View files

```
src/components/dashboard/
  WeekendDawnView.tsx
  WeekendDayView.tsx
  WeekendEveningView.tsx       ← Saturday
  WeekendSundayEveningView.tsx ← Sunday, prep-for-Monday
```

All four share the same `Glass` / `CardLabel` / `LockStrip` primitives. Only composition differs.

---

## Widget Grid — What Changes

### Drop on weekends

| Widget | Why |
|---|---|
| `WWA` (Wright Adventures hero) | Explicitly wrong on Saturday. Career block doesn't exist on weekends. |
| `WLaborDay` countdown | Career-flavored urgency. Move to weekday mid-morning only. |
| `W4PM` | The 4pm drink-replacement project hour is a weekday craving structure. Saturdays at 4pm you're ideally still outside. |
| `WKids` "kids home soon" | Kids are home all day. Framing is wrong. |
| `WMIT` neglect-scoring | Weekday corrective framing. Weekend MITs should be aspirational, not punitive. |

### Add for weekends

**`WAdventureToday`** — Weekend hero card. "Today's move." If a plan exists (calendar event, Strava planned route), surfaces it. If nothing is planned, shows a contextual prompt pulling weather + recovery + time since last big effort:

> *38°F at A-Basin. Last skied 11 days ago. Recovery: Go Hard. Tangier and the kids are free until 2pm.*

This is the weekend equivalent of `WMorningHero`. Lives at the top of `WeekendDayView`.

**`WConditions`** — Multi-location weather. Denver + Howard + wherever you're headed. Extends the existing OWM integration (Howard fallback already in config). Weekend-only widget.

**`WLongEffort`** — Not the program prescription — that's `WWorkout`. This is the week's big outdoor effort: long run, ride, ski tour, hike. Pulls from `training_goals` (WLW is in there), recovery score, and weather to surface a recommendation if not already planned. Plays into the WLW training arc.

**`WFamilyDay`** — What the kids want, what's age-appropriate, what's open. Chase (hoops/ball), Ada (ninja course), Sylvia (engagement, good truck helper). Maps to *places* on weekends. Pulls from Google Calendar family events + a curated `weekend_spots` table built out over time.

**`WProjectSession`** — For deep-time project work. Pulls from `projects` table but framed for a multi-hour session, not a MIT slot:

> *Bottle Cap Bike · 47% complete · Next: braze the rack mounts · 3hrs available before dinner*

Weekend midday hero when recovery says Rest or the weather is bad.

**`WWeekAhead`** *(Sunday evening only)* — Surfaces Monday's calendar, Run Club reminder, WA priorities, and the week's training targets. This is the Sunday-evening-specific widget that makes `weekend-evening-sun` feel different from Saturday.

### Reframe (same widget, different content)

| Widget | Weekday | Weekend |
|---|---|---|
| `WInspire` | General adventure rotation | Biased toward `activity_type IN ('rafting','alpine','skiing','hiking','biking')` — who you are at your best |
| Recovery score | Gates Go Hard vs Zone 2 | Gates "send the bigger objective" vs "scale it back" — same data, higher stakes |
| `WDrinks` | Evening check-in | Still present, still important — just less foregrounded |
| `WCalendar` | Work + school schedule | Family + adventure events only |

---

## Morning Briefing — Weekend Variant

The weekday `BRIEFING_SYSTEM_PROMPT` is tuned for M–F rhythm. On Saturday that voice is wrong — it's the same friend, but a different conversation.

Weekend variant drops:
- Labor Day fish-or-cut-bait urgency (present 5 days a week — weekends breathe)
- WA block / proposal / inbox framing
- MIT neglect-scoring language

Weekend variant adds:
- "What's the move today?" as the organizing question
- Weather + Howard + trail/snow conditions in context
- Family as primary, body as supporting
- Still ends with ONE specific next action — but it's "leave by 8am for Mt. Falcon," not "reply to Jenn"
- Thinking prompt reframed: weekday = strategy/decision; weekend = "what would make this a great day"

Implemented as a parallel `WEEKEND_BRIEFING_SYSTEM_PROMPT` in the Edge Function. `day_type` param passed from client determines which prompt fires.

---

## Database

One new table to support weekend planning:

```sql
create table weekend_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  plan_date date not null,
  activity_type text,           -- 'run' | 'ride' | 'ski' | 'hike' | 'family' | 'project' | 'other'
  title text,                   -- "Mt. Falcon loop" / "Bottle Cap session" / "A-Basin with kids"
  location text,
  departure_time time,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, plan_date)
);
```

V1: manual entry via FAB + Inbox triage (no new UI needed — capture "Saturday: Mt. Falcon 9am" and triage routes it here). V2: pull from Strava planned routes / calendar events.

Also extend `weekend_spots` later:

```sql
create table weekend_spots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  type text,                    -- 'trail' | 'park' | 'ski' | 'bike' | 'family'
  location text,
  latitude float,
  longitude float,
  age_appropriate_min int,      -- min kid age
  drive_minutes int,
  notes text
);
```

---

## `TOD_BLOCKS` Extension

```typescript
export const WEEKEND_BLOCKS: Record<WeekendBlock, { label: string; sub: string; time: string }> = {
  'weekend-dawn':        { label: 'DAWN',    sub: 'SLOW START · COFFEE · KIDS',          time: '6:00–9:00'  },
  'weekend-day':         { label: 'THE DAY', sub: 'THE MOVE · BIG EFFORT',               time: '9:00–5PM'   },
  'weekend-evening-sat': { label: 'EVENING', sub: 'DINNER · LOG · WIND DOWN',            time: '5PM+'       },
  'weekend-evening-sun': { label: 'SUNDAY',  sub: 'PREP · WEEK AHEAD · RUN CLUB TMR',   time: '5PM+'       },
}
```

---

## Build Order

```
1. useDayType() hook + dayTypeOverride plumbing in Header
2. Stub four WeekendView components — existing widgets minus wrong ones
3. weekend_plans table + WAdventureToday hero
4. Weekend morning briefing prompt variant (day_type param in Edge Function)
5. WConditions multi-location weather
6. WLongEffort (pulls from training_goals + recovery)
7. WFamilyDay
8. WProjectSession
9. WWeekAhead (Sunday evening only)
10. weekend_spots table + curate initial list
```

Steps 1–2 ship together: they prove routing works and remove the friction of wrong weekday widgets, even before a single new weekend widget exists. Each subsequent step is an isolated PR.

---

## Risks & Tradeoffs

**Doubled view tree.** Every design system change lands twice. Mitigate by keeping all primitives (`Glass`, `CardLabel`, `LockStrip`) strictly shared — only composition forks.

**Friday→Saturday and Sunday→Monday transitions.** Friday 6pm is weekday-evening (logging the week). Saturday 6am is weekend-dawn. The `getDay()` boundary is midnight — this will occasionally feel slightly off but is correct enough for v1. Sunday→Monday is the more meaningful transition; `weekend-evening-sun` is specifically designed to bridge it.

**No adventure data sources wired yet.** AllTrails, ski conditions, Strava planned routes — none in schema. V1 weekend mode is primarily *removing* wrong weekday widgets and *adding* manual-entry hero card. Don't try to wire AllTrails in the same sprint.

**`dayTypeOverride` matters.** Traveling Wednesday, want weekend mode. Or home sick Saturday, want weekday mode. Build the override from day one — same pattern as `todOverride`.

---

*Part of adadv3nture — built by Ben Wright*
*West Line Winder 30K · Sept 26, 2026 · Buena Vista, CO*
