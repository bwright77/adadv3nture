# Design System

## Brand

**Logo:** FJ62 Land Cruiser front-on, desert Southwest / Monument Valley backdrop, distressed badge treatment. `/public/adadv3nture.png`

**Aesthetic:** NOT corporate. NOT clinical. NOT a wellness app.
Field notebook meets morning newspaper for your life. Personal, warm, earned.
Data-dense but never overwhelming. The FJ62 in the Southwest desert is the emotional anchor — rugged, capable, always going somewhere. Built for one person, because it was.

## Colors

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

## Typography

- **Display / Wordmark:** Bold condensed, uppercase — match the badge aesthetic
- **Body:** Clean, readable, slightly warm — not cold tech sans-serif
- **Numbers / Metrics:** Tabular figures, monospace-adjacent for data readability

## UI Pattern: iOS Widget Dashboard

Widget principles:
- One concept per widget — workout, recovery, sleep, weight, drinks, MIT, calendar, inspiration
- Glanceable — you know the status in 2 seconds without reading
- Generous border radius (16-24px)
- Breathing room — never pack widgets together
- Tappable for detail view, but the surface tells you what you need
- Time-aware — different widgets feature based on time of day
- No heavy chrome, no gradients fighting each other

Widget sizes:
- Small (1x1) — single metric, one number, one status
- Medium (2x1) — metric + sparkline trend, or workout card
- Large (2x2) — MIT list, calendar, inspiration photo
- Full-width — daily briefing, day review

Layout: A few hero widgets featured prominently based on time of day. Mobile-first. Desktop expands to 3-4 columns; mobile is 2 columns or stacked.

## Time-Aware Layout

```
MORNING (7:35-9:30am)
Hero: Workout · Thinking Prompt · Weather
Supporting: Recovery · Drink Ratio · Inspiration · Labor Day countdown

MID-MORNING (9:30am-2:30pm)
Hero: Wright Adventures · Today's MITs · Inbox triage
Supporting: Calendar · Recovery · Drink Ratio · Inspiration

AFTERNOON (2:30-6pm)
Hero: 4pm Project · Weather · Kids context
Supporting: Art deadline (if active) · Calendar · Inspiration · MITs

EVENING (6pm+)
Hero: Day Review · Drink count entry · Tomorrow preview
Supporting: Inbox capture · Inspiration · MIT completion
```

## Widget Catalog

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
