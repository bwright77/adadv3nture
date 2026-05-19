-- Promote training_weeks from a freeform per-week override into a season
-- plan container. New columns are nullable — old rows continue to work as
-- override-only entries, but a seeded plan can now carry phase grouping, a
-- focus line, and a key milestone marker per week.
--
-- phase_id is constrained so the UI can group weeks reliably.

alter table training_weeks
  add column if not exists phase_id text
    check (phase_id is null or phase_id in ('base', 'build', 'peak', 'taper')),
  add column if not exists focus text,
  add column if not exists key_marker text;

create index if not exists idx_training_weeks_user_week
  on training_weeks(user_id, week_start);
