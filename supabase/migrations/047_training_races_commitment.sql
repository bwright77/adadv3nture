-- Race calendar corrections (handoff v3, Change 2)
--
--  1. Add a `commitment` column so the UI can distinguish locked races from
--     conditional "maybe" events (Ride the Hurricane) and aspirational ones.
--     Existing rows default to 'locked'.
--  2. Add Bergen Peak HM (Aug 22) — referenced everywhere (raceTargets, the
--     19-week plan, the briefing) but never seeded as a training_goals row.
--     FIBArk got migration 038; Bergen never got its own.
--  3. Mark Ride the Hurricane conditional.
--  4. Correct West Line Winder 30K to the verified course: 18.1 mi / 2,450 ft.
--
-- Guarded so a re-run is a no-op.

alter table training_goals
  add column if not exists commitment text not null default 'locked'
  check (commitment in ('locked', 'conditional', 'aspirational'));

-- Bergen Peak Half Marathon — Aug 22 2026. The single best WLW predictor.
insert into training_goals
  (user_id, event_name, event_date, event_type, distance_label, elevation_label, location, is_anchor, status, commitment, notes)
select
  u.id,
  'Bergen Peak HM',
  '2026-08-22',
  'trail_run',
  '13.1 mi',
  '2,451 ft',
  'Bergen Peak, Evergreen CO',
  false,
  'active',
  'locked',
  'Key WLW predictor. Summit 9,708 ft. Target 2:34–2:44. No aid stations — cup-free, full vest. Watch the mile 7–8 summit split: run it controlled, read the data.'
from users u
where u.email = 'benw21@gmail.com'
  -- Match by date, not exact name: a Bergen row may already exist under a
  -- different title (e.g. "Bergen Peak Half Marathon") so we never duplicate it.
  and not exists (
    select 1 from training_goals g
    where g.user_id = u.id and g.event_date = '2026-08-22'
  );

-- Ride the Hurricane (Aug 2) is a maybe — logistics / FOCO recovery / family.
update training_goals
set commitment = 'conditional'
where event_name ilike '%hurricane%'
  and user_id = (select id from users where email = 'benw21@gmail.com');

-- West Line Winder 30K verified course: 18.1 mi, 2,450 ft gain
-- (high 8,530 ft / low 7,930 ft / avg 8,260 ft).
update training_goals
set distance_label = '18.1 mi', elevation_label = '2,450 ft'
where (event_name ilike '%west line%' or event_name ilike '%winder%')
  and user_id = (select id from users where email = 'benw21@gmail.com');
