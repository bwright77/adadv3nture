-- Per-activity Strava "streams" (per-second time-series) + derived metrics.
-- One row per activity; raw arrays kept for re-derivation, plus the two numbers
-- worth querying often: HR time-in-zone and aerobic decoupling (WLW durability).

create table activity_streams (
  activity_id    uuid primary key references activities(id) on delete cascade,
  user_id        uuid not null,
  strava_id      bigint not null,
  time_s         int[],          -- seconds from start
  hr_bpm         smallint[],
  distance_m     real[],
  altitude_m     real[],
  velocity_mps   real[],
  time_in_zone_s int[],          -- [Z1,Z2,Z3,Z4,Z5] seconds
  decoupling_pct real,           -- HR:pace drift, 1st half vs 2nd half
  created_at     timestamptz default now()
);

alter table activity_streams enable row level security;

create policy "own streams" on activity_streams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
