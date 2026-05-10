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

// Shared with useTimeOfDay — both treat before-6am as "still last night"
import { MORNING_START_MINS } from './useTimeOfDay' // = 6 * 60

function getDayType(date: Date): DayType {
  const dow = date.getDay()
  return (dow === 0 || dow === 6) ? 'weekend' : 'weekday'
}

function getWeekendBlock(date: Date): WeekendBlock {
  const mins = date.getHours() * 60 + date.getMinutes()
  const dow = date.getDay()
  // Before 6am on Sunday = still Saturday evening (matches weekday morning threshold)
  if (dow === 0 && mins < MORNING_START_MINS) return 'weekend-evening-sat'
  if (mins < 9 * 60) return 'weekend-dawn'
  if (mins < 17 * 60) return 'weekend-day'
  return dow === 0 ? 'weekend-evening-sun' : 'weekend-evening-sat'
}

// Full 4-block internal order — used for routing
export const WEEKEND_BLOCK_ORDER: WeekendBlock[] = [
  'weekend-dawn', 'weekend-day', 'weekend-evening-sat', 'weekend-evening-sun',
]

// 3-item picker exposed to user — Sat/Sun evening distinction is internal routing, not a user choice
export const WEEKEND_PICKER_ORDER: WeekendBlock[] = [
  'weekend-dawn', 'weekend-day', 'weekend-evening-sat',
]
```

Override exposed in Header — same UX as the existing `tod` override. Manual override persists until the block naturally transitions. The picker shows 3 pills (Dawn, The Day, Evening). Both evening blocks highlight the same "EVENING" pill. When Sunday is active, picking "Evening" still routes to `WeekendSundayEveningView` (see App.tsx routing below).

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

`wb` is resolved from `wbOverride ?? realWb`, with one smart exception: if the user picks "Evening" (stored as `weekend-evening-sat`) while the real block is `weekend-evening-sun`, we preserve the Sunday routing:

```typescript
const wb = (() => {
  if (!wbOverride) return realWb
  if (wbOverride === 'weekend-evening-sat' && realWb === 'weekend-evening-sun') return 'weekend-evening-sun'
  return wbOverride
})()
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

Three new tables added for weekend mode (migrations 020–022):

```sql
-- migration 020: weekend day planning (one row per day)
create table weekend_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  plan_date date not null,
  activity_type text,           -- 'run' | 'ride' | 'ski' | 'hike' | 'family' | 'project' | 'other'
  title text,
  location text,
  departure_time time,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, plan_date)
);

-- migration 021: weekend briefing columns on daily_plans
alter table daily_plans
  add column if not exists weekend_briefing text,
  add column if not exists weekend_thinking_prompt text,
  add column if not exists weekend_briefing_generated_at timestamptz;

-- migration 022: curated family/adventure spots for WFamilyDay + WAdventureToday
create table weekend_spots (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete cascade,
  name         text not null,
  type         text not null check (type in ('trail', 'park', 'ski', 'bike', 'family', 'run')),
  location     text,
  latitude     float,
  longitude    float,
  age_min      integer default 0,     -- min kid age (0 = all ages)
  drive_minutes integer,
  notes        text,
  created_at   timestamptz default now()
);
```

14 spots seeded via `scripts/seed-weekend-spots.js` — Wash Park, South Platte Trail, Cherry Creek SP, Chatfield SP, Denver Zoo, Denver Museum of Nature, Red Rocks Trail, Bear Creek Trail, Lair o' the Bear, Mount Falcon, Chautauqua Park, Castlewood Canyon, Howard/Arkansas River, Mount Princeton Hot Springs.

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
✓ 1. useDayType() hook + weekend block picker in Header
✓ 2. Stub four WeekendView components — existing widgets minus wrong ones
✓ 3. weekend_plans table (020) + WAdventureToday hero + PlanDaySheet
✓ 4. Weekend morning briefing prompt variant (day_type param in Edge Function)
✓ 5. WConditions — Denver road + Howard trail conditions side-by-side
✓ 6. WLongEffort — big outdoor effort tracker with WLW countdown
✓ 7. WFamilyDay — Chase/Ada/Sylvia cards + age-appropriate spot suggestions
✓ 8. WProjectSession — lowest-progress non-career project, hours before dinner
✓ 9. WWeekAhead — Monday calendar, Run Club, training targets, career look-ahead
✓ 10. weekend_spots table (022) + 14 spots seeded
```

All 10 steps complete. Weekend mode is live.

---

## Risks & Tradeoffs

**Doubled view tree.** Every design system change lands twice. Mitigate by keeping all primitives (`Glass`, `CardLabel`, `LockStrip`) strictly shared — only composition forks.

**Friday→Saturday and Sunday→Monday transitions.** Friday 6pm is weekday-evening (logging the week). Saturday 6am is weekend-dawn. The `getDay()` boundary is midnight — this will occasionally feel slightly off but is correct enough for v1. Sunday→Monday is the more meaningful transition; `weekend-evening-sun` is specifically designed to bridge it.

**No adventure data sources wired yet.** AllTrails, ski conditions, Strava planned routes — none in schema. V1 weekend mode is primarily *removing* wrong weekday widgets and *adding* manual-entry hero card. Don't try to wire AllTrails in the same sprint.

**`dayTypeOverride` matters.** Traveling Wednesday, want weekend mode. Or home sick Saturday, want weekday mode. Build the override from day one — same pattern as `todOverride`.

---

*Part of adadv3nture — built by Ben Wright*
*West Line Winder 30K · Sept 26, 2026 · Buena Vista, CO*
