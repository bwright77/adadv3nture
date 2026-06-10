-- WLW 30K plan update (handoff v4, Jun 9 2026)
--
-- Five changes from the Jun 9 coaching handoff:
--   1. DROP Ride the Hurricane (Aug 2) — the Aug 2 weekend is reallocated to a
--      long run. Set status='skipped' (non-destructive, reversible; getTrainingGoals
--      already filters skipped rows).
--   2. DEMOTE FOCO Fondo (Jul 19) — keep it, but it's a long aerobic + fueling
--      rehearsal now, not a bike-specific training block. No cycling-build weekends.
--   3. Rebuild the long-run calendar around DURATION + FUEL RATE (g carbs/hr) as
--      the primary targets ("tracked like pace"). New first-class columns hold
--      planned duration + fuel target + the logged actual.
--   4. Reshape peak/taper: the Bergen 14mi sim is gone (Bergen itself is the
--      dress rehearsal); Aug 9 is the peak-duration long run.
--   5. HR zones unchanged (code already matches: Z2 top 152, etc.).
--
-- target_long_run_miles is kept as a secondary/approx display field; duration +
-- fuel lead. Actuals are never touched. UPDATEs silently no-op when a week_start
-- row is absent. Guarded so a re-run is a no-op.

-- ── 1. First-class duration + fuel columns ───────────────────────────────
alter table training_weeks
  add column if not exists long_run_duration text,            -- e.g. '2:30', '2:00–2:15'
  add column if not exists long_run_fuel_g_hr text,           -- planned rate, e.g. '70–80'
  add column if not exists actual_long_run_fuel_g_hr numeric; -- logged actual (basic logging)

-- ── 2. Drop Ride the Hurricane ───────────────────────────────────────────
update training_goals set status = 'skipped'
where event_name ilike '%hurricane%'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- ── 3. Demote FOCO Fondo to a long aerobic + fueling effort ──────────────
update training_goals
set notes = 'Demoted to a long aerobic effort + fueling rehearsal (not a bike-specific training block). Ride it steady, fuel 90+ g/hr on the bike. No cycling-build weekends in the plan.'
where event_name ilike '%foco%'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- ── 4. Long-run calendar rebuild (duration + fuel led) ───────────────────
-- Jun 8 — White Ranch / Belcher Hill sustained climb. Z2 145–150, cap 152.
update training_weeks set
  phase_label = 'BASE · Build week',
  target_run_miles = 30, target_long_run_miles = 12,
  target_cycling_miles = 25, target_strength_sessions = 2,
  long_run_duration = '2:30', long_run_fuel_g_hr = '70–80',
  notes = 'White Ranch — Belcher Hill sustained climb. ~2:30, Z2 145–150 / cap 152, hike the steeps. Fuel 70–80 g/hr; eat on the clock Thu + Fri AM (start full).'
where week_start = '2026-06-08'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Jun 15 — FIBArk race week. Fri Jun 19 rolling Z2 long run (NOT big descent),
-- then FIBArk Sun Jun 21 raced. No big taper — 1 easy day only.
update training_weeks set
  phase_label = 'BASE · FIBArk race week',
  target_run_miles = 24, target_long_run_miles = 9,
  target_cycling_miles = 15, target_strength_sessions = 1,
  long_run_duration = '2:00–2:15', long_run_fuel_g_hr = '75–80',
  notes = 'Fri Jun 19 long run, rolling terrain (no big descent), strict Z2, capped 2:00–2:15, fuel 75–80. FIBArk 10K raced Sun Jun 21 (56–58min) — no taper beyond 1 easy day.'
where week_start = '2026-06-15'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Jun 22 — recovery + return to long run. 20-min running threshold field test
-- before Build to verify the 152/165 caps.
update training_weeks set
  phase_label = 'BASE · Recovery week',
  target_run_miles = 22, target_long_run_miles = 11,
  target_cycling_miles = 20, target_strength_sessions = 2,
  long_run_duration = '2:30–2:45', long_run_fuel_g_hr = '80',
  notes = 'FIBArk recovery + return to long run (~2:30–2:45, fuel ~80). Do the 20-min running threshold field test this week to verify the 152/165 zone caps before Build.'
where week_start = '2026-06-22'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Jun 29 — cycling exits the plan; running long run continues.
update training_weeks set
  phase_label = 'BUILD · Run focus',
  target_run_miles = 28, target_long_run_miles = 12,
  target_cycling_miles = 15, target_strength_sessions = 2,
  long_run_duration = '2:45–3:00', long_run_fuel_g_hr = '80–90',
  notes = 'Long run ~2:45–3:00, fuel 80–90 g/hr. No bike-specific build — cycling is easy volume only.'
where week_start = '2026-06-29'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Jul 6 — building long-run duration.
update training_weeks set
  phase_label = 'BUILD · Run focus',
  target_run_miles = 28, target_long_run_miles = 13,
  target_cycling_miles = 15, target_strength_sessions = 2,
  long_run_duration = '3:00', long_run_fuel_g_hr = '85–90',
  notes = 'Long run ~3:00, fuel 85–90 g/hr. Easy bike volume only.'
where week_start = '2026-07-06'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Jul 13 — FOCO Fondo week. The Sunday Fondo IS the long effort.
update training_weeks set
  phase_label = 'BUILD · FOCO week',
  target_run_miles = 18, target_long_run_miles = 6,
  target_cycling_miles = 62, target_strength_sessions = 1,
  long_run_duration = '4:00+', long_run_fuel_g_hr = '90+',
  notes = 'FOCO Fondo 62mi Sun Jul 19 — long aerobic effort + fueling rehearsal (4:00+, fuel 90+ on the bike). Running is maintenance only this week.'
where week_start = '2026-07-13'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Jul 20 — FOCO recovery + back to running long.
update training_weeks set
  phase_label = 'BUILD · Run focus',
  target_run_miles = 26, target_long_run_miles = 13,
  target_cycling_miles = 10, target_strength_sessions = 2,
  long_run_duration = '3:00–3:15', long_run_fuel_g_hr = '90',
  notes = 'FOCO recovery early week, then long run ~3:00–3:15, fuel ~90 g/hr.'
where week_start = '2026-07-20'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Jul 27 — long run freed by dropping Hurricane. Heat day: sodium-plan test.
update training_weeks set
  phase_label = 'BUILD · Trail focus',
  target_run_miles = 28, target_long_run_miles = 13,
  target_cycling_miles = 10, target_strength_sessions = 2,
  long_run_duration = '3:15', long_run_fuel_g_hr = '90–95',
  notes = 'Long run freed by dropping Ride the Hurricane. Heat day — sodium-plan test (salted CARBS Fuel 450mg, Tailwind). ~3:15, fuel 90–95 g/hr.'
where week_start = '2026-07-27'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Aug 3 — peak duration long run.
update training_weeks set
  phase_label = 'PEAK · Peak duration',
  target_run_miles = 30, target_long_run_miles = 15,
  target_cycling_miles = 10, target_strength_sessions = 2,
  long_run_duration = '3:15–3:30', long_run_fuel_g_hr = '90–100',
  notes = 'Peak-duration long run ~3:15–3:30, fuel 90–100 g/hr. Vest + nutrition fully dialed. Deliberate descent volume (downhill durability).'
where week_start = '2026-08-03'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Aug 10 — reduced pre-Bergen (the 14mi Bergen sim is removed; Bergen is the rehearsal).
update training_weeks set
  phase_label = 'PEAK · Pre-Bergen',
  target_run_miles = 24, target_long_run_miles = 9,
  target_cycling_miles = 5, target_strength_sessions = 2,
  long_run_duration = '2:00', long_run_fuel_g_hr = '90',
  notes = 'Reduced long run ~2:00, fuel ~90, ahead of the Bergen dress rehearsal. Bergen itself replaces the sim.'
where week_start = '2026-08-10'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Aug 17 — Bergen Peak HM dress rehearsal (Sat Aug 22).
update training_weeks set
  phase_label = 'PEAK · Bergen race week',
  target_run_miles = 20, target_long_run_miles = 13.1,
  target_cycling_miles = 0, target_strength_sessions = 1,
  long_run_duration = '~2:30 race', long_run_fuel_g_hr = '90–100',
  notes = 'Bergen Peak HM Sat Aug 22 — full WLW dress rehearsal: no aid, carry everything, fuel 90–100 g/hr, race the descent (eccentric rehearsal). 13.1mi/2451ft, target 2:34–2:44.'
where week_start = '2026-08-17'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Aug 24 — post-Bergen build long run (not recovery-only).
update training_weeks set
  phase_label = 'PEAK · Final build',
  target_run_miles = 28, target_long_run_miles = 14,
  target_cycling_miles = 10, target_strength_sessions = 2,
  long_run_duration = '3:00', long_run_fuel_g_hr = '95–105',
  notes = 'Post-Bergen build. Long run ~3:00, fuel 95–105 g/hr (race rate). Final descent durability work.'
where week_start = '2026-08-24'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Aug 31 — final long run (Sep 5–6), then taper begins.
update training_weeks set
  phase_label = 'TAPER · Final long run',
  target_run_miles = 24, target_long_run_miles = 12,
  target_cycling_miles = 5, target_strength_sessions = 2,
  long_run_duration = '2:30', long_run_fuel_g_hr = '95–105',
  notes = 'Final long run Sep 5–6 (~2:30, fuel 95–105 g/hr) — last race-rate rehearsal. Taper opens after.'
where week_start = '2026-08-31'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Sep 7 — taper week 1.
update training_weeks set
  phase_label = 'TAPER · Build down',
  target_run_miles = 20, target_long_run_miles = 9,
  target_cycling_miles = 5, target_strength_sessions = 2,
  long_run_duration = null, long_run_fuel_g_hr = 'maintain habits',
  notes = 'Taper begins. Volume drops ~30%, keep intensity short. Maintain fueling habits — practice the race-morning protocol on the long-ish run.'
where week_start = '2026-09-07'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Sep 14 — deep taper.
update training_weeks set
  phase_label = 'TAPER · Deep taper',
  target_run_miles = 14, target_long_run_miles = 6,
  target_cycling_miles = 0, target_strength_sessions = 1,
  long_run_duration = null, long_run_fuel_g_hr = 'maintain habits',
  notes = 'Deep taper. Volume drops ~55%. Legs should feel restless. Lock the race-week fueling protocol.'
where week_start = '2026-09-14'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Sep 21 — WLW race week (insert if absent; 048 created it).
insert into training_weeks (
  user_id, week_start, phase_label,
  target_run_miles, target_long_run_miles, target_cycling_miles, target_strength_sessions,
  long_run_duration, long_run_fuel_g_hr, notes
)
select id, '2026-09-21', 'TAPER · WLW race week',
       6, 0, 0, 0,
       null, 'race fueling',
       'Birthday Sep 22. West Line Winder 30K Sat Sep 26 (18.1mi/2450ft, target 3:24–3:45). Race fueling 95–105 g/hr; ~100–150g across 3hr pre-start, done 60–90min out.'
from users where email = 'benw21@gmail.com'
on conflict (user_id, week_start) do update
  set phase_label = excluded.phase_label,
      target_run_miles = excluded.target_run_miles,
      target_long_run_miles = excluded.target_long_run_miles,
      target_cycling_miles = excluded.target_cycling_miles,
      target_strength_sessions = excluded.target_strength_sessions,
      long_run_duration = excluded.long_run_duration,
      long_run_fuel_g_hr = excluded.long_run_fuel_g_hr,
      notes = excluded.notes;
