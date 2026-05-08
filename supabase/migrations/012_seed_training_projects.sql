-- Training goals: all three events, no conditional flag
insert into training_goals (user_id, event_name, event_date, event_type, distance_label, elevation_label, location, is_anchor, status)
select
  id,
  'FOCO Fondo "Double Dog Dare You"',
  '2026-07-19',
  'cycling_gravel',
  '62.6 mi',
  '2,962 ft',
  'Fort Collins, CO',
  false,
  'active'
from users where email = 'benw21@gmail.com';

insert into training_goals (user_id, event_name, event_date, event_type, distance_label, elevation_label, location, is_anchor, status)
select
  id,
  'Ride the Hurricane',
  '2026-08-02',
  'cycling_road',
  '40 mi',
  '5,250 ft',
  'Port Angeles, WA',
  false,
  'active'
from users where email = 'benw21@gmail.com';

insert into training_goals (user_id, event_name, event_date, event_type, distance_label, elevation_label, location, is_anchor, status)
select
  id,
  'West Line Winder 30K',
  '2026-09-26',
  'trail_run',
  '18.6 mi',
  null,
  'Buena Vista, CO',
  true,
  'active'
from users where email = 'benw21@gmail.com';

-- Training weeks: seed current + next 19 weeks with phase progression
-- Week 1: May 4 — Phase 1: Run base + Strength + intro cycling
with u as (select id from users where email = 'benw21@gmail.com')
insert into training_weeks (user_id, week_start, phase_label, target_run_miles, target_long_run_miles, target_cycling_miles, target_strength_sessions)
select u.id, w.week_start, w.phase_label, w.trm, w.tlr, w.tcm, w.tss from u, (values
  ('2026-05-04'::date, 'RUN BASE',        20, 6,  0,  3),
  ('2026-05-11'::date, 'RUN BASE',        22, 7,  0,  3),
  ('2026-05-18'::date, 'RUN BASE',        24, 8,  15, 3),
  ('2026-05-25'::date, 'RUN BASE',        25, 8,  20, 3),
  ('2026-06-01'::date, 'RUN + CYCLING',   26, 9,  25, 3),
  ('2026-06-08'::date, 'RUN + CYCLING',   27, 10, 30, 2),
  ('2026-06-15'::date, 'TRAVEL / ITALY',  20, 7,  20, 2),
  ('2026-06-22'::date, 'RUN + CYCLING',   22, 8,  30, 2),
  ('2026-06-29'::date, 'CYCLING PRIMARY', 15, 6,  60, 2),
  ('2026-07-06'::date, 'CYCLING PRIMARY', 12, 5,  70, 2),
  ('2026-07-13'::date, 'FOCO FONDO WEEK', 10, 4,  80, 1),
  ('2026-07-20'::date, 'RECOVERY',        12, 5,  40, 2),
  ('2026-07-27'::date, 'HURRICANE PREP',  10, 4,  70, 2),
  ('2026-08-03'::date, 'RECOVERY',        12, 5,  40, 2),
  ('2026-08-10'::date, 'TRANSITION',      18, 7,  30, 2),
  ('2026-08-17'::date, 'TRAIL FOCUS',     28, 12, 0,  2),
  ('2026-08-24'::date, 'TRAIL FOCUS',     30, 14, 0,  2),
  ('2026-08-31'::date, 'TRAIL FOCUS',     28, 12, 0,  2),
  ('2026-09-07'::date, 'TAPER',           22, 9,  0,  1),
  ('2026-09-14'::date, 'TAPER',           16, 6,  0,  1)
) as w(week_start, phase_label, trm, tlr, tcm, tss);

-- Projects
with u as (select id from users where email = 'benw21@gmail.com')
insert into projects (id, user_id, title, description, category, deadline_date, soft_deadline_date, progress_pct, next_action, status)
values
  (
    gen_random_uuid(),
    (select id from u),
    'Bottle Cap Bike',
    '3''×4'' mosaic-style piece composed of sorted bottle caps. Entry for the bike show.',
    'art',
    '2026-07-03',
    '2026-06-01',
    35,
    'Source melamine board for backing',
    'active'
  ),
  (
    gen_random_uuid(),
    (select id from u),
    'adadv3nture',
    'Personal health and productivity OS. Labor Day: WA income or get a real job.',
    'software',
    '2026-09-01',
    null,
    20,
    'Wire up Strava OAuth and persist activities',
    'active'
  );

-- Bottle Cap Bike milestones
with p as (select id from projects where title = 'Bottle Cap Bike' and user_id = (select id from users where email = 'benw21@gmail.com'))
insert into project_milestones (project_id, title, done, done_at, sort_order)
select p.id, m.title, m.done, m.done_at, m.sort_order from p, (values
  ('Source bottle caps',            true,  now(), 1),
  ('Sort caps by color',            true,  now(), 2),
  ('Design layout in Illustrator',  true,  now(), 3),
  ('Create build plan',             true,  now(), 4),
  ('Source backing (melamine board)', false, null, 5),
  ('Print layout as template',      false, null,  6),
  ('Build: bike layer',             false, null,  7),
  ('Build: background layer',       false, null,  8),
  ('Build: midground layer',        false, null,  9),
  ('Final assembly & mounting',     false, null,  10)
) as m(title, done, done_at, sort_order);

-- adadv3nture milestones
with p as (select id from projects where title = 'adadv3nture' and user_id = (select id from users where email = 'benw21@gmail.com'))
insert into project_milestones (project_id, title, done, done_at, sort_order)
select p.id, m.title, m.done, m.done_at, m.sort_order from p, (values
  ('Project init + schema',           true,  now(), 1),
  ('Auth + protected routes',         true,  now(), 2),
  ('Widget grid shell',               true,  now(), 3),
  ('Inbox capture + triage',          true,  now(), 4),
  ('Todo lists with urgency',         true,  now(), 5),
  ('Strava OAuth + activity sync',    false, null,  6),
  ('Withings OAuth + body metrics',   false, null,  7),
  ('Recovery score engine',           true,  now(), 8),
  ('Morning briefing (Anthropic)',    true,  now(), 9),
  ('Weather widget',                  false, null,  10),
  ('Trends engine + charts',          false, null,  11),
  ('Inspiration widget + upload',     true,  now(), 12),
  ('Google Calendar integration',     false, null,  13),
  ('PWA + mobile polish',             false, null,  14)
) as m(title, done, done_at, sort_order);
