-- FIBArk 10K Trail Run — Jun 21 2026 tune-up race / fitness benchmark on the
-- way to Bergen (Aug 22) and WLW (Sep 26). Triple Crown Competition final on
-- the familiar Arkansas Hills / Tenderfoot trails behind Salida.
--
-- training_goals has no `role` column, so the tune-up framing lives in notes.
-- event_type is constrained to trail_run / cycling_road / cycling_gravel.
-- Guarded so a re-run won't duplicate the row.

insert into training_goals
  (user_id, event_name, event_date, event_type, distance_label, elevation_label, location, is_anchor, status, website_url, notes)
select
  u.id,
  'FIBArk 10K Trail Run',
  '2026-06-21',
  'trail_run',
  '6.2 mi',
  '750 ft',
  'Arkansas Hills Trail System, Salida CO',
  false,
  'active',
  'https://www.athlinks.com/event/fibark-10k-trail-run-355370',
  'Tune-up race / fitness benchmark. Target 56–58 min. Triple Crown Competition final, behind Tenderfoot Mountain. Mixed dirt roads and singletrack on a familiar course (run before, MTB regularly). Profile: hard opening climb (350 ft in mile 1), rolling middle, second climb to high point at mile 4.5, fast descent finish.'
from users u
where u.email = 'benw21@gmail.com'
  and not exists (
    select 1 from training_goals g
    where g.user_id = u.id and g.event_date = '2026-06-21' and g.event_name = 'FIBArk 10K Trail Run'
  );
