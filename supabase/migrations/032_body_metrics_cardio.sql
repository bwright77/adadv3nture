-- Additional cardiovascular metrics from the Withings Body Comp scale:
--   visceral_fat already exists (integer, 1–12 rating from migration 001)
--   vascular_age is a single integer summarizing cardiovascular age
--   pulse_wave_velocity is arterial stiffness in m/s (numeric, ~5–15 range)

alter table body_metrics add column if not exists vascular_age integer;
alter table body_metrics add column if not exists pulse_wave_velocity numeric;
