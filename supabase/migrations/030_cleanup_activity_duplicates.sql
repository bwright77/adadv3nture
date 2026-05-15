-- One-off cleanup for Strava sync bugs fixed in 9d4b91b:
--   1. Peloton-bridged rides occasionally landed in `activities` twice under
--      different strava_ids, slipping past the id-only dedupe.
--   2. `activity_date` was sliced from UTC start_date, so workouts crossing
--      the Denver day boundary showed under yesterday's date.
--
-- Pass 1 — collapse duplicates by (user, type, start ±5min, duration ±30s),
-- keep the earliest created_at, delete the rest.

with grouped as (
  select
    id,
    row_number() over (
      partition by
        user_id,
        activity_type,
        date_trunc('hour', start_time)
          + (extract(minute from start_time)::int / 5) * interval '5 minutes',
        (duration_seconds / 30)
      order by created_at, id
    ) as rn
  from activities
  where start_time is not null
    and duration_seconds is not null
)
delete from activities
where id in (select id from grouped where rn > 1);

-- Pass 2 — for any row whose stored activity_date doesn't match the
-- Denver-local date of its start_time, fix it. This corrects the
-- "showed up under yesterday" rows that synced before the start_date_local
-- switch.

update activities
set activity_date = (start_time at time zone 'America/Denver')::date
where start_time is not null
  and activity_date <> (start_time at time zone 'America/Denver')::date;
