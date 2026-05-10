# W50Hikes Widget Spec

> Weekend widget. Tracks progress through *50 Hikes with Kids: Colorado* (Gorton & Tillack). Surfaces one suggested hike per weekend morning. Logs completions.

---

## Widget Identity

| Field | Value |
|---|---|
| Component | `W50Hikes.tsx` |
| Location | `src/components/dashboard/widgets/W50Hikes.tsx` |
| Grid span | 12 (full width) |
| Appears in | `WeekendDawnView`, `WeekendDayView` |
| Dark mode | Supported via `dark?: boolean` prop |

---

## Database

### Migration

```sql
-- supabase/migrations/013_50hikes.sql

create table hikes_50 (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references users(id) on delete cascade,

  -- from book
  book_number         integer not null,
  name                text not null,
  region              text,             -- 'Front Range' | 'North and Central Rockies' | 'Rocky Mountains' | 'Plateau Lands' | 'Southern Rockies' | 'Eastern Plains'
  hub                 text,
  distance_mi         numeric(4,2),
  difficulty          text check (difficulty in ('easy','moderate','challenging')),
  elevation_gain_ft   integer,
  highlights          text,             -- comma-separated string, e.g. 'Waterfall, views, cave'

  -- enriched
  drive_minutes_denver integer,
  best_months         text[],           -- e.g. ARRAY['May','Jun','Jul','Aug','Sep','Oct']
  alltrails_url       text,
  trailhead_lat       numeric(9,6),
  trailhead_lng       numeric(9,6),

  -- completion
  done                boolean default false,
  date_done           date,
  strava_activity_id  bigint,
  family_rating       integer check (family_rating between 1 and 5),
  notes               text,

  created_at          timestamptz default now(),

  unique(user_id, book_number)
);

alter table hikes_50 enable row level security;

create policy "owner only" on hikes_50
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Seed

Import `hikes_50_colorado.csv` via Supabase dashboard: Table Editor → hikes_50 → Insert → Import CSV.

All 50 rows seed with `done=false`, `date_done=null`, `family_rating=null`, `strava_activity_id=null`, `notes=null`.

**Note on AllTrails URLs:** Front Range hikes (1–10) were directly verified. Hikes 11–50 use AllTrails' standard slug pattern — spot-check a handful before seeding, as AllTrails occasionally appends `--2` or `--3` suffixes for duplicate trail names.

---

## Seed Data (all 50 hikes)

| # | Name | Hub | Mi | Difficulty | Elev | Drive | Best Months | Highlights | AllTrails |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Horsetooth Falls | Fort Collins | 2.4 | Moderate | 325 | 75 | May–Oct | Wildflowers, views, waterfall, cave | [↗](https://www.alltrails.com/trail/us/colorado/horsetooth-falls--4) |
| 2 | Chautauqua and Bluebell Loop | Boulder | 1.6 | Moderate | 463 | 45 | Apr–Oct | Flowers, cool geology, history | [↗](https://www.alltrails.com/trail/us/colorado/chautauqua-and-bluebell-trail-loop) |
| 3 | Crags Hotel Ruins | Eldorado Springs/Boulder | 3.0 | Challenging | 725 | 35 | Apr–Oct | View, geology, historical ruins | [↗](https://www.alltrails.com/trail/us/colorado/crags-hotel-ruins-and-continental-divide-overlook) |
| 4 | White Ranch and Sawmill Trail | Golden | 2.3 | Moderate | 361 | 40 | Apr–Oct | Historic sawmill, view | [↗](https://www.alltrails.com/trail/us/colorado/sawmill-trail-and-belcher-hill-trail-loop) |
| 5 | Lair o' the Bear | Morrison | 2.0 | Easy | 141 | 35 | Apr–Oct | Castle and beautiful creek | [↗](https://www.alltrails.com/trail/us/colorado/bear-creek-trail-to-the-castle) |
| 6 | Brother and Sisters Loop | Evergreen | 3.5 | Moderate | 456 | 45 | Apr–Oct | Meadows, forests, views, cool rocks, climbing | [↗](https://www.alltrails.com/trail/us/colorado/the-brother-and-sisters-loop) |
| 7 | Mount Falcon | Morrison | 2.6 | Moderate | 361 | 35 | Apr–Oct | Meadows, forests, castle ruins, lookout tower | [↗](https://www.alltrails.com/trail/us/colorado/castle-meadow-and-tower-trails) |
| 8 | Red Rock Canyon | Manitou Springs | 1.8 | Easy | 282 | 75 | Mar–Nov | Red rocks, quarry, lake | [↗](https://www.alltrails.com/trail/us/colorado/red-rock-canyon-open-space-main-loop) |
| 9 | Seven Bridges | Colorado Springs | 3.7 | Challenging | 725 | 75 | May–Oct | Bridges, creek, forest | [↗](https://www.alltrails.com/trail/us/colorado/seven-bridges-trail) |
| 10 | Devil's Head | Castle Rock | 2.8 | Challenging | 843 | 75 | May–Oct | Views, fire tower, meadows | [↗](https://www.alltrails.com/trail/us/colorado/devils-head-trail) |
| 11 | Pine Valley Lake | Conifer | 1.6 | Easy | 36 | 45 | May–Oct | Lake, fishing, bridges, old railroad tracks | [↗](https://www.alltrails.com/trail/us/colorado/pine-valley-ranch-loop-trail) |
| 12 | South Rim of Roxborough State Park | Roxborough State Park | 2.1 | Moderate | 466 | 40 | Apr–Oct | Wildflowers, geology, birdwatching, views | [↗](https://www.alltrails.com/trail/us/colorado/south-rim-trail--3) |
| 13 | Eleven Mile State Park | Florissant/Colo Springs | 4.0 | Moderate | 427 | 90 | May–Oct | Lake, climbing rocks, caves | [↗](https://www.alltrails.com/trail/us/colorado/eleven-mile-canyon-trail) |
| 14 | Twin Lakes | Buena Vista | 4.6 | Easy | 213 | 120 | Jun–Oct | Lake, historical hotel, meadows, aspens | [↗](https://www.alltrails.com/trail/us/colorado/twin-lakes-trail--4) |
| 15 | Judd Falls | Crested Butte | 2.4 | Moderate | 486 | 195 | Jun–Oct | Waterfall, views | [↗](https://www.alltrails.com/trail/us/colorado/judd-falls-trail) |
| 16 | Crater Lake | Snowmass Village | 4.0 | Challenging | 705 | 180 | Jun–Sep | Glaciers, views | [↗](https://www.alltrails.com/trail/us/colorado/crater-lake-trail--3) |
| 17 | Linkins Lake | Aspen | 1.2 | Moderate | 495 | 165 | Jul–Sep | Lake, mountain views, creek | [↗](https://www.alltrails.com/trail/us/colorado/linkins-lake-trail) |
| 18 | Rifle Falls | Rifle | 0.9 | Easy | 79 | 195 | Apr–Oct | Caves, waterfalls | [↗](https://www.alltrails.com/trail/us/colorado/rifle-falls-trail) |
| 19 | Uranium Mine | Steamboat Springs | 3.0 | Challenging | 600 | 165 | Jun–Oct | Old mine, wildflowers, creek | [↗](https://www.alltrails.com/trail/us/colorado/uranium-mine-trail) |
| 20 | Lake Agnes | Steamboat Springs | 1.2 | Challenging | 410 | 165 | Jul–Sep | Lake, views | [↗](https://www.alltrails.com/trail/us/colorado/lake-agnes-trail--2) |
| 21 | Adams Falls | Grand Lake | 1.1 | Easy | 128 | 90 | May–Oct | Falls, creek fun, meadows | [↗](https://www.alltrails.com/trail/us/colorado/adams-falls-trail) |
| 22 | Dream and Emerald Lakes | Estes Park | 3.4 | Challenging | 712 | 90 | Jun–Sep | Three lakes, views, elk | [↗](https://www.alltrails.com/trail/us/colorado/dream-lake-trail) |
| 23 | Alberta Falls | Estes Park | 1.6 | Easy | 224 | 90 | Jun–Oct | Falls, cool rocks, views | [↗](https://www.alltrails.com/trail/us/colorado/alberta-falls-trail) |
| 24 | Lumpy Ridge | Estes Park | 1.9 | Moderate | 433 | 90 | May–Oct | Views, cool rocks | [↗](https://www.alltrails.com/trail/us/colorado/lumpy-ridge-loop-trail) |
| 25 | Mitchell Lake | Ward | 1.8 | Easy | 223 | 75 | Jul–Sep | Lake | [↗](https://www.alltrails.com/trail/us/colorado/mitchell-lake-trail) |
| 26 | Saint Mary's Glacier | Idaho Springs | 1.8 | Challenging | 591 | 60 | Jun–Sep | Glacier, views, lake | [↗](https://www.alltrails.com/trail/us/colorado/saint-marys-glacier-trail) |
| 27 | Chief Mountain | Idaho Springs | 3.2 | Challenging | 928 | 60 | Jun–Sep | Summit, views, evergreen forest | [↗](https://www.alltrails.com/trail/us/colorado/chief-mountain-trail--2) |
| 28 | Lily Pad Lake | Breckenridge | 3.3 | Moderate | 354 | 90 | Jun–Oct | Lake, moose | [↗](https://www.alltrails.com/trail/us/colorado/lily-pad-lake-trail) |
| 29 | Lower Cataract Lake | Silverthorne | 2.3 | Moderate | 223 | 80 | Jun–Oct | Lake, waterfall | [↗](https://www.alltrails.com/trail/us/colorado/lower-cataract-lake-trail) |
| 30 | Sallie Barber Mine | Breckenridge | 3.0 | Challenging | 394 | 90 | Jun–Oct | Old mine | [↗](https://www.alltrails.com/trail/us/colorado/sallie-barber-mine-trail) |
| 31 | Harpers Corner | Dinosaur | 2.2 | Moderate | 285 | 225 | Apr–Jun, Sep–Nov | Dinosaur tracks, geology | [↗](https://www.alltrails.com/trail/us/colorado/harpers-corner-trail) |
| 32 | Coke Ovens | Grand Junction | 1.4 | Easy | 141 | 225 | Mar–May, Sep–Nov | Desert big horn sheep, unusual rock formations, great canyon views | [↗](https://www.alltrails.com/trail/us/colorado/coke-ovens-trail) |
| 33 | Devil's Kitchen | Grand Junction | 1.4 | Moderate | 52 | 225 | Mar–May, Sep–Nov | An awesome geologic playground | [↗](https://www.alltrails.com/trail/us/colorado/devils-kitchen-trail) |
| 34 | Mica Mine | Grand Junction | 2.6 | Moderate | 291 | 225 | Mar–May, Sep–Nov | Rockhounding, hoodoos, old mine equipment | [↗](https://www.alltrails.com/trail/us/colorado/mica-mine-trail) |
| 35 | Exclamation Point | Gunnison/Grand Junction | 3.0 | Moderate | 384 | 225 | Mar–May, Sep–Nov | Crazy canyon views, neat geology | [↗](https://www.alltrails.com/trail/us/colorado/exclamation-point-trail) |
| 36 | Dillon Pinnacles | Sanpiero/Grand Junction | 3.7 | Moderate | 489 | 195 | Mar–May, Sep–Nov | Volcanic pinnacles, views | [↗](https://www.alltrails.com/trail/us/colorado/dillon-pinnacles-trail) |
| 37 | Sand Canyon | Cortez | 2.2 | Easy | 315 | 330 | Mar–May, Sep–Nov | Cliff dwellings, views, canyons, history, geology | [↗](https://www.alltrails.com/trail/us/colorado/sand-canyon-trail--2) |
| 38 | Petroglyph Point | Cortez | 2.4 | Challenging | 328 | 330 | Mar–May, Sep–Nov | Cliff dwellings, views, canyons, history, geology | [↗](https://www.alltrails.com/trail/us/colorado/petroglyph-point-trail) |
| 39 | Keystone Gorge | Telluride | 1.8 | Moderate | 492 | 330 | Jun–Oct | River, bridges, gorge, views, mining ruins | [↗](https://www.alltrails.com/trail/us/colorado/keystone-gorge-trail) |
| 40 | Bear Creek Preserve | Telluride | 4.8 | Challenging | 925 | 330 | Jun–Sep | Waterfall, river, views | [↗](https://www.alltrails.com/trail/us/colorado/bear-creek-trail--8) |
| 41 | Twin Sisters | Durango | 2.6 | Easy | 390 | 330 | May–Oct | Views, lake, forest | [↗](https://www.alltrails.com/trail/us/colorado/twin-sisters-trail--7) |
| 42 | Perimeter and Ice Park Loop | Ouray | 3.9 | Challenging | 1030 | 300 | Jun–Sep | Water play, creek, river, waterfalls, views, geological features | [↗](https://www.alltrails.com/trail/us/colorado/perimeter-trail-and-ice-park-loop) |
| 43 | Sheep Creek Hot Springs | Pagosa Springs | 3.5 | Challenging | 689 | 270 | May–Oct | Hot springs, river, forest | [↗](https://www.alltrails.com/trail/us/colorado/sheep-creek-trail) |
| 44 | Zapata Falls | Alamosa | 1.2 | Easy | 215 | 225 | Apr–Oct | Hidden waterfall, creek, views of Great Sand Dunes | [↗](https://www.alltrails.com/trail/us/colorado/zapata-falls-trail) |
| 45 | San Isabel | Rye | 2.0 | Moderate | 226 | 120 | Apr–Oct | River, water play, rocks, meadows | [↗](https://www.alltrails.com/trail/us/colorado/san-isabel-trail) |
| 46 | Paint Mines Interpretive Park | Calhan | 2.5 | Easy | 289 | 75 | Mar–Jun, Sep–Nov | Geological formations, hoodoos | [↗](https://www.alltrails.com/trail/us/colorado/paint-mines-interpretive-park-loop) |
| 47 | Castlewood Canyon | Castle Rock | 2.0 | Moderate | 200 | 45 | Mar–Nov | Canyon, creek, cool rocks | [↗](https://www.alltrails.com/trail/us/colorado/inner-canyon-loop-trail) |
| 48 | Vogel Canyon | La Junta | 1.4 | Easy | 125 | 165 | Mar–May, Sep–Nov | Sandstone canyon, Native petroglyphs | [↗](https://www.alltrails.com/trail/us/colorado/vogel-canyon-trail) |
| 49 | Riverside Trail | Fort Morgan | 1.8 | Easy | 3 | 75 | Apr–Oct | River, birdwatching | [↗](https://www.alltrails.com/trail/us/colorado/riverside-trail--46) |
| 50 | Pawnee Buttes | Fort Collins | 4.3 | Moderate | 338 | 90 | Apr–Oct | Views, birdwatching | [↗](https://www.alltrails.com/trail/us/colorado/pawnee-buttes-trail) |

---

## Component Spec

### Props

```typescript
interface W50HikesProps {
  dark?: boolean
}
```

### Data fetching

```typescript
// hooks/use50Hikes.ts

export function use50Hikes() {
  // fetch all 50 from hikes_50, ordered by book_number
  // returns: { hikes, doneCount, suggested, isLoading }
  // suggested = one undone hike selected by priority:
  //   1. Not done
  //   2. current month ∈ best_months[]     (seasonal fit)
  //   3. drive_minutes_denver <= 90         (day-trip range)
  //   4. lowest book_number                 (work through in order)
  //   fallback: not done + lowest book_number, any distance/season
}
```

### Layout — two states

#### State A: Collapsed (default in `WeekendDawnView`)

```
┌─────────────────────────────────────────────────────┐
│ · 50 HIKES WITH KIDS · COLORADO                     │
│                                                     │
│  [████████░░░░░░░░░░░░░░░░]  12 / 50               │
│                                                     │
│  SUGGESTED TODAY                                    │
│  Lair o' the Bear                    2.0mi · 141ft  │
│  Castle and beautiful creek                         │
│  35 min · Morrison · Best: Apr–Oct                  │
│                                [ALLTRAILS ↗] [DONE ✓]│
└─────────────────────────────────────────────────────┘
```

Highlights appear as a dedicated line between the hike name and the detail row. This is the key value-add — it answers "why this one?" without opening AllTrails.

#### State B: Expanded (tap card header to toggle)

```
┌─────────────────────────────────────────────────────┐
│ · 50 HIKES WITH KIDS · COLORADO          12 / 50 ▲  │
│                                                     │
│  [████████░░░░░░░░░░░░░░░░]                         │
│                                                     │
│  ✓  1  Horsetooth Falls                   ★★★★★  ↗ │
│        Wildflowers, views, waterfall, cave           │
│                                                     │
│  ✓  2  Chautauqua and Bluebell Loop       ★★★★☆  ↗ │
│        Flowers, cool geology, history                │
│                                                     │
│     3  Crags Hotel Ruins                          ↗ │
│        View, geology, historical ruins               │
│                                                     │
│     5  Lair o' the Bear    ← suggested today      ↗ │
│        Castle and beautiful creek                    │
│  ... (scrollable)                                   │
│                                                     │
│  [ + LOG A COMPLETION ]                             │
└─────────────────────────────────────────────────────┘
```

Highlights render as a second line under every hike name in the expanded list — done and undone alike.

---

## Interactions

### AllTrails link
`[ALLTRAILS ↗]` on the suggested card opens `alltrails_url` in a new tab. In expanded view, the `↗` icon on each row does the same. Rows without an `alltrails_url` hide the icon silently.

### Mark done (collapsed)
Tap `[DONE ✓]` → opens `HikeLogSheet` bottom sheet:
- Date (defaults to today)
- Family rating (1–5 stars, tap to set)
- Notes (optional text input)
- Strava activity link (optional)

Confirm → upserts `hikes_50` row, triggers refetch, suggestion advances to next qualifying hike.

### Mark done (expanded list)
Tap any undone row → same `HikeLogSheet` bottom sheet.

### Tap done row (expanded)
Shows completion date + family rating inline. Tap to edit via same sheet.

### Scroll
Expanded list scrollable within card. Max height ~60vh. Done hikes muted (name opacity 0.5, checkmark in C.rust). Suggested hike has 2px C.rust left border accent.

---

## Visual Design

Follow existing Glass card conventions exactly.

```typescript
// Colors
const doneColor    = dark ? 'rgba(255,255,255,0.25)' : 'rgba(26,18,8,0.2)'
const activeColor  = C.rust   // suggested left border + progress bar fill
const linkColor    = C.sand   // AllTrails ↗ icon

// Progress bar: height 4px, border-radius 2px, full width
// fill = (doneCount / 50) * 100% — same pattern as WTraining

// Suggested hike card (collapsed state)
// slightly elevated background
// 2px C.rust left border
// name: .badge fs-14
// highlights: .mono fs-11 opacity 0.7   ← the "why" line
// detail row: .mono fs-11 opacity 0.55  (distance · elev · drive · hub · best months)

// Expanded list rows
// name: .badge fs-13
// highlights: .mono fs-11 opacity 0.6   ← second line on every row
// done rows: name opacity 0.5, stars inline after name
// ↗ link icon: right-aligned, C.sand, fs-11
```

### Typography

| Element | Class | Size | Notes |
|---|---|---|---|
| Card label | `.badge` | `var(--fs-11)` | |
| Progress fraction | `.mono` | `var(--fs-13)` | |
| Hike name (suggested) | `.badge` | `var(--fs-14)` | |
| Highlights (suggested) | `.mono` | `var(--fs-11)` | opacity 0.7 |
| Detail row | `.mono` | `var(--fs-11)` | opacity 0.55 |
| Hike name (list) | `.badge` | `var(--fs-13)` | opacity 0.5 if done |
| Highlights (list) | `.mono` | `var(--fs-11)` | opacity 0.6 |
| Stars | inline SVG | 10px | C.rust fill |
| AllTrails ↗ | `.mono` | `var(--fs-11)` | C.sand |

---

## Suggestion Logic (in `use50Hikes`)

```
Priority order:
1. Not done
2. current month ∈ best_months[]     (seasonal fit)
3. drive_minutes_denver <= 90         (day-trip range)
4. lowest book_number                 (work through in order)

Fallback: not done + lowest book_number, ignoring distance and season.
```

Runs client-side from full fetch. No Edge Function needed.

---

## File Checklist for Claude Code

```
supabase/migrations/013_50hikes.sql               ← schema + RLS
supabase/seed/hikes_50_colorado.csv               ← all 50 rows, ready to import
src/hooks/use50Hikes.ts                            ← data fetch + suggestion logic
src/components/dashboard/widgets/W50Hikes.tsx      ← widget (collapsed + expanded)
src/components/dashboard/widgets/HikeLogSheet.tsx  ← bottom sheet (log completion)
```

Add `<W50Hikes />` to:
- `src/components/dashboard/WeekendDawnView.tsx`
- `src/components/dashboard/WeekendDayView.tsx`

---

## Out of Scope (v1)

- AllTrails API integration (links only, no live data)
- Trail conditions / weather at trailhead
- Photo logging per hike (Strava covers this for now)
- Push notification for weekend morning suggestion
- Sharing / export of completion list

---

*Part of adadv3nture — Weekend Mode*
*Data source: 50 Hikes with Kids: Colorado — Gorton & Tillack (Timber Press, 2023)*
