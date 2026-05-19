-- Race start time (separate from event_date so we keep DATE comparisons clean
-- for countdowns / ordering). Stored as Postgres `time` — local clock time,
-- no timezone, since the user enters what's printed on the race page.

alter table training_goals add column if not exists event_start_time time;
