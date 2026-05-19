-- v3 of the WLW plan introduces per-week Quality and Strength prescriptions
-- that aren't captured by the existing numeric target columns. e.g.:
--   Quality:  "PZ Max 1× · Strides 2× · Cruise miles 1×"
--   Strength: "3× TS" / "3× RK" / "2× maint" / "1×"
-- Both are display-only text fields for the UI; the integer
-- target_strength_sessions column stays as the count for the briefing math.

alter table training_weeks add column if not exists quality_prescription text;
alter table training_weeks add column if not exists strength_prescription text;
