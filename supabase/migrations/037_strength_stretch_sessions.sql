-- Strength template revision (2026-05-29): Total Strength → Row Bootcamp,
-- weekly target reduced 3× → 2× with 3× as a stretch goal. The stretch
-- target is per-week (3 in base/build, lower in peak/taper), so it gets
-- its own column alongside target_strength_sessions.

alter table training_weeks add column if not exists strength_stretch_sessions integer;
