-- Seed Total Strength program — restarted W1D1 May 8 2026
insert into program_tracker (
  user_id,
  program_name,
  instructor,
  current_week,
  current_day,
  total_weeks,
  next_workout_title,
  next_workout_type,
  started_at,
  active
)
values (
  'a2bcae76-355c-4771-949f-2a5928b056ff',
  'Total Strength',
  'Andy Speer',
  1,
  1,
  4,
  'Total Strength · W1D1 · Full Body',
  'strength',
  '2026-05-08',
  true
)
on conflict do nothing;
