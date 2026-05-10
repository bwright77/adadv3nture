# User Context

```typescript
const USER_CONTEXT = {
  name: "Ben Wright",
  location: "Denver, CO",
  elevation_ft: 5318,
  age: 48,                      // born Sept 22, 1977
  email: "benw21@gmail.com",

  // Fitness baselines
  ftp_watts: 269,               // 20-min FTP test, March 5 2026
  mhr: 191,                     // observed max, Seattle hill, May 6 2026
                                // best-case sea level — Denver practical ~182-185
  rhr: 63,
  hrr: 128,

  hr_zones: {                   // Karvonen, calibrated for Denver 5,318ft
    z1_recovery:   [127, 139],
    z2_aerobic:    [139, 152],
    z3_tempo:      [152, 165],
    z4_threshold:  [165, 178],
    z5_vo2max:     [178, 191],
  },
  // Sea level: HR ceiling ~8bpm higher (altitude RBC adaptation)

  current_strength_program: "Total Strength (Andy Speer)",
  strength_week: 1,             // restarted May 11 2026 post-vacation
  strength_reactivation_weights: {
    chest_press_lbs: 25,
    curls_lbs: 20,
    dumbbell_flys_lbs: 10,
  },
  current_long_run_miles: 6.2,
  avg_run_pace: "9:35/mi",      // hilly Seattle terrain

  current_weight_lbs: 187,
  target_weight_lbs: 178,       // Project Six Pack
  on_glp1: true,                // started November 2024
                                // track trends not daily fluctuations

  school_dropoff: "7:15am",
  workout_window: "7:40-9:30am",
  planning_session: "9:30am",
  school_pickup: "2:30pm",
  kids_home: "3:45pm",
  project_hour: "4:00-5:00pm",
  run_club: "Monday evenings, Wash Park (family joins 1x/month)",

  kids: [
    { name: "Chase", age: 8.5, note: "wants to shoot hoops/throw ball" },
    { name: "Ada", age: 7, note: "ninja training course, self-sufficient" },
    { name: "Sylvia", age: 5, note: "needs more engagement, good truck helper" },
  ],
  wife: "Tangier Barnes Wright",
  wife_employer: "PeopleForBikes",

  truck: "1988 Toyota Land Cruiser FJ62 (V3NTRUS)",
  truck_goal: "250K → 500K miles",

  runs_in_rain: true,
  avoids_biking_outside_in_rain: true,
  higher_heat_tolerance_on_bike: true,
  dislikes_running_july_august: true,
  trail_runs_at: "Howard, CO (the ranch — 20min from Buena Vista)",
};
```

## Target Events

| Event | Date | Details | Status |
|-------|------|---------|--------|
| Velo-city Conference | June 16-19 2026 | Rimini Italy — Tangier's conference | Confirmed |
| FOCO Fondo "Double Dog Dare You" | July 19 2026 | 62.6mi / 2,962ft gravel | Conditional on Italy |
| Ride the Hurricane | Aug 2 2026 | 40mi / 5,250ft, Port Angeles WA | Conditional on Slovenia |
| **West Line Winder 30K** | **Sept 26 2026** | **18.6mi trail, Buena Vista CO** | **ANCHOR — REGISTER NOW** |

## Training Phases

```
May 11 → July 1      Run base + Strength + intro cycling
July 1 → Aug 15     Cycling primary + travel
Aug 15 → Sept 20    Trail running focus
Sept 22             48th birthday 🎂
Sept 26             West Line Winder 30K 🏔️
```

Howard ranch runs = West Line Winder race-specific training (20min from BV).

## Workout Recommendation Factors (priority order)

1. Weather (rain → no outdoor ride; heat → prefer bike over run)
2. Location (Howard = trail run; travel = bodyweight/run)
3. Recovery score (RHR + sleep + drinks + days since rest)
4. Training phase (run base / cycling / trail focus / taper)
5. Program sequence (Total Strength next session)
6. Schedule (Run Club Monday = always run, never override)
