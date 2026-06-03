-- Summer Mode — week-type persistence + summer briefing cache.
-- Week-type (Solo/Camp/Weekend) lives on users so the morning-briefing Edge Function
-- can read it server-side (precedent: users.last_known_location, migration 026). It's a
-- deliberate Sunday-set value, not an ephemeral override.

alter table users add column if not exists summer_week_type text
  check (summer_week_type in ('solo','camp','weekend')) default 'solo';
alter table users add column if not exists summer_week_type_set_on date;

-- Summer briefing cache — one column-pair serves all three voices (the editorial pick is
-- a function of summer_week_type that day). Mirrors morning_briefing / weekend_briefing.
alter table daily_plans add column if not exists summer_briefing text;
alter table daily_plans add column if not exists summer_thinking_prompt text;
alter table daily_plans add column if not exists summer_briefing_generated_at timestamptz;
