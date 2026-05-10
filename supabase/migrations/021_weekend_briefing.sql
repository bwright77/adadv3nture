alter table daily_plans
  add column if not exists weekend_briefing text,
  add column if not exists weekend_thinking_prompt text,
  add column if not exists weekend_briefing_generated_at timestamptz;
