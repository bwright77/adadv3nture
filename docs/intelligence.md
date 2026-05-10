# Intelligence Layer

## MIT Framework

**Two non-negotiables (tracked but never compete for MIT slots):**
- **BODY** → 7:40am workout. Always happens. Always logged.
- **CAREER** → Mid-morning block. Wright Adventures daily. Non-negotiable.

**Four rotating categories:**

| Category | What it covers | Natural slot |
|----------|---------------|--------------|
| FAMILY | Kids, intentional presence, art, making things | 4pm |
| HOME | House projects, truck, ranch | 4pm — weather dependent |
| CAREER | Work, proposals, finances, Wright Adventures pipeline | Mid-morning |
| PROJECTS | Personal projects, relationships, errands that matter | Anytime |

**DB mapping:** `family_creative_done/note` → FAMILY, `home_done/note` → HOME, `career_done/note` → CAREER, `projects_done/note` → PROJECTS

**MIT generation logic:**
- Score categories by neglect + deadline pressure
- Surface top 2-3 MITs from highest-scoring categories
- Never more than 2 from same category
- Persistent reminders surface before rotating MITs
- Evening is protected — never colonize it with MITs

**Thinking prompt:** One specific unresolved question from yesterday's MIT data. Chewed on during 7:40am workout. Answered at 9:30am triage.

**Pilot lights:** Each category has a flame. Goal: keep all five lit.

## Recovery Score Algorithm

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

## Morning Briefing System Prompt

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

## Inbox & Capture

Brain is for having ideas, not holding them.

**Capture UX:** FAB on every screen. One tap → text field → enter → done. Zero categorization at capture. Must work at 11pm half-asleep.

**Morning triage (9:30am, 2 min):** Each item: Route to list | MIT today | Delete

**Routing:** time+intention → MIT/task · deadline → reminder · house/truck → todo · career → WA pipeline · not important → delete

## Trends Engine

Report card format — scannable in 10 seconds. Tap for full chart.

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

## Inspiration Widget

**Philosophy:** Data motivates the analytical brain. Photos motivate the soul. Decades of adventure photography surfaced as "on this day" moments.

**Core interaction:** One photo at a time, date-proximity priority ("5 years ago today"). Tap to expand, swipe for next. Refreshes daily.

**Surfacing algorithm:**
1. Photos from exact date ±3 days in past years (user_starred desc, times_surfaced asc)
2. Same month, any year
3. Any photo weighted toward least-surfaced

**Upload flow:** Lightroom → export JPEG 1920px long edge, quality 85, EXIF intact → drag-drop upload → app extracts taken_at from EXIF → batch caption editor.

**Activity types:** rafting · alpine · skiing · hiking · biking · running · climbing · family · kids · travel · other

**Storage:** Supabase Storage. Thumbnails at 400px for widget. Full res on expand.
