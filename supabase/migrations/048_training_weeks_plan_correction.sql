-- training_weeks plan correction (handoff v3, Change 3)
--
-- The migration-012 seed is stale: Italy travel was canceled, FIBArk and Bergen
-- weren't planned, and the long-run progression diverged from the current plan.
-- Replace the target_* / phase_label / notes for current+forward weeks. Actuals
-- are never touched. Strength targets land at 2× (1× on race weeks), which also
-- satisfies the "2× target / 3× stretch" Row Bootcamp revision.
--
-- phase_id is intentionally left as-is: week character is computed from phase_id
-- + key_marker + race-in-week (weekCharacter.ts), so we don't store it here.
-- UPDATEs silently no-op if a week_start row is absent for the user.

-- Past weeks: leave actuals intact, just normalize labels.
update training_weeks set phase_label = 'BASE · Build week'
where week_start in ('2026-05-04', '2026-05-11', '2026-05-18')
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set phase_label = 'BASE · Recovery week'
where week_start = '2026-05-25'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- Current and forward weeks.
update training_weeks set
  phase_label = 'BASE · Build week',
  target_run_miles = 28, target_long_run_miles = 11,
  target_cycling_miles = 25, target_strength_sessions = 2,
  notes = 'Long run 11mi/1000ft. Trail terrain.'
where week_start = '2026-06-01'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'BASE · Build week',
  target_run_miles = 30, target_long_run_miles = 12,
  target_cycling_miles = 30, target_strength_sessions = 2,
  notes = 'Long run 12mi/1200ft.'
where week_start = '2026-06-08'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- FIBArk week (was Italy/travel — Italy was canceled).
update training_weeks set
  phase_label = 'BASE · FIBArk race week',
  target_run_miles = 22, target_long_run_miles = 6.2,
  target_cycling_miles = 20, target_strength_sessions = 1,
  notes = 'FIBArk 10K Sun Jun 21. Sat = 4-5mi shakeout. Race effort 56-58min.'
where week_start = '2026-06-15'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'BASE · Recovery week',
  target_run_miles = 22, target_long_run_miles = 9,
  target_cycling_miles = 25, target_strength_sessions = 2,
  notes = 'FIBArk recovery + return to easy long run.'
where week_start = '2026-06-22'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'BUILD · Cycling focus',
  target_run_miles = 25, target_long_run_miles = 11,
  target_cycling_miles = 40, target_strength_sessions = 2,
  notes = 'Run pulls back, cycling builds toward FOCO.'
where week_start = '2026-06-29'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'BUILD · FOCO build',
  target_run_miles = 25, target_long_run_miles = 12,
  target_cycling_miles = 50, target_strength_sessions = 2,
  notes = 'Last hard cycling week before FOCO taper.'
where week_start = '2026-07-06'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'BUILD · FOCO race week',
  target_run_miles = 16, target_long_run_miles = 6,
  target_cycling_miles = 75, target_strength_sessions = 1,
  notes = 'FOCO Fondo Sun Jul 19. Run is maintenance only.'
where week_start = '2026-07-13'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'BUILD · Recovery week',
  target_run_miles = 22, target_long_run_miles = 9,
  target_cycling_miles = 20, target_strength_sessions = 2,
  notes = 'FOCO recovery. Easy running resumes mid-week.'
where week_start = '2026-07-20'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'BUILD · Hurricane race week (conditional)',
  target_run_miles = 20, target_long_run_miles = 8,
  target_cycling_miles = 50, target_strength_sessions = 2,
  notes = 'Ride the Hurricane Sun Aug 2 — CONDITIONAL. If yes: 40mi road Port Angeles. If no: normal training week with bike volume and 10mi long run.'
where week_start = '2026-07-27'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'BUILD · Trail focus',
  target_run_miles = 28, target_long_run_miles = 12,
  target_cycling_miles = 15, target_strength_sessions = 2,
  notes = 'Cycling exits. Trail running primary. Vest + nutrition dial-in.'
where week_start = '2026-08-03'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'PEAK · Bergen sim week',
  target_run_miles = 32, target_long_run_miles = 14,
  target_cycling_miles = 10, target_strength_sessions = 2,
  notes = 'Bergen simulator: 14mi/1500ft. Hardest long run of block.'
where week_start = '2026-08-10'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'PEAK · Bergen race week',
  target_run_miles = 20, target_long_run_miles = 13.1,
  target_cycling_miles = 0, target_strength_sessions = 1,
  notes = 'Bergen Peak HM Sat Aug 22. 13.1mi/2451ft. Target 2:34-2:44.'
where week_start = '2026-08-17'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'TAPER · Bergen recovery',
  target_run_miles = 16, target_long_run_miles = 7,
  target_cycling_miles = 15, target_strength_sessions = 2,
  notes = 'Bergen recovery. No quality work until day 10+.'
where week_start = '2026-08-24'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'TAPER · Final build',
  target_run_miles = 26, target_long_run_miles = 13,
  target_cycling_miles = 10, target_strength_sessions = 2,
  notes = 'Last hard week. 13mi/1200ft. Final WLW predictor.'
where week_start = '2026-08-31'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'TAPER · Build down',
  target_run_miles = 22, target_long_run_miles = 10,
  target_cycling_miles = 10, target_strength_sessions = 2,
  notes = 'Volume drops 30%. Keep intensity short.'
where week_start = '2026-09-07'
  and user_id = (select id from users where email = 'benw21@gmail.com');

update training_weeks set
  phase_label = 'TAPER · Deep taper',
  target_run_miles = 14, target_long_run_miles = 6,
  target_cycling_miles = 0, target_strength_sessions = 1,
  notes = 'Volume drops 55%. Legs should feel restless.'
where week_start = '2026-09-14'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- WLW race week (insert — not currently in the seed).
insert into training_weeks (
  user_id, week_start, phase_label,
  target_run_miles, target_long_run_miles, target_cycling_miles, target_strength_sessions,
  notes
)
select id, '2026-09-21', 'TAPER · WLW race week',
       6, 0, 0, 0,
       'Birthday Sep 22. WLW Sat Sep 26. 18.1mi/2450ft. Target 3:24-3:45.'
from users where email = 'benw21@gmail.com'
on conflict (user_id, week_start) do update
  set phase_label = excluded.phase_label,
      target_run_miles = excluded.target_run_miles,
      target_long_run_miles = excluded.target_long_run_miles,
      target_cycling_miles = excluded.target_cycling_miles,
      target_strength_sessions = excluded.target_strength_sessions,
      notes = excluded.notes;
