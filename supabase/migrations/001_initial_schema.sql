-- adadv3nture initial schema
-- Run via: supabase db push

-- Enable UUID extension (already enabled on Supabase, but be explicit)
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  baseline_rhr integer default 63,
  mhr integer default 191,
  rhr integer default 63,
  ftp_watts integer default 269,
  weight_lbs numeric,
  height_inches integer default 71,
  timezone text default 'America/Denver',
  preferences jsonb default '{}',
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- ACTIVITIES (unified — Strava + manual)
-- ─────────────────────────────────────────────
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  source text not null check (source in ('strava', 'peloton', 'manual')),
  activity_type text not null,
  title text,
  activity_date date not null,
  start_time timestamptz,
  duration_seconds integer,
  distance_miles numeric,
  elevation_feet numeric,
  calories integer,
  avg_hr integer,
  max_hr integer,
  avg_pace_seconds_per_mile integer,
  avg_watts integer,
  total_output_kj numeric,
  tss numeric,
  strava_id bigint unique,
  peloton_id text unique,
  raw_json jsonb,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_activities_user_date on activities(user_id, activity_date desc);

-- ─────────────────────────────────────────────
-- BODY METRICS (Withings + manual)
-- ─────────────────────────────────────────────
create table if not exists body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  measured_at timestamptz not null,
  source text not null check (source in ('withings', 'manual')),
  weight_lbs numeric,
  body_fat_pct numeric,
  muscle_mass_lbs numeric,
  muscle_mass_pct numeric,
  bone_mass_lbs numeric,
  water_pct numeric,
  bmi numeric,
  visceral_fat integer,
  bmr integer,
  withings_id bigint unique,
  created_at timestamptz default now()
);

create index if not exists idx_body_metrics_user_date on body_metrics(user_id, measured_at desc);

-- ─────────────────────────────────────────────
-- RECOVERY SIGNALS (Apple Health + manual)
-- ─────────────────────────────────────────────
create table if not exists recovery_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  signal_date date not null,
  rhr integer,
  hrv_ms numeric,
  sleep_score integer,
  sleep_duration_hours numeric,    -- null = watch charging, NOT zero
  drinks_consumed integer default 0,
  source text default 'apple_health',
  recovery_score numeric,
  recovery_tier text check (recovery_tier in ('go_hard', 'moderate', 'recovery', 'unknown')),
  created_at timestamptz default now(),
  unique(user_id, signal_date)
);

-- ─────────────────────────────────────────────
-- PROGRAM TRACKER (prescription — Strava logs what happened)
-- ─────────────────────────────────────────────
create table if not exists program_tracker (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  program_name text not null,
  instructor text,
  current_week integer default 1,
  current_day integer default 1,
  total_weeks integer,
  next_workout_title text,
  next_workout_url text,
  next_workout_type text,
  last_completed_date date,
  started_at date,
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- DAILY PLANS
-- ─────────────────────────────────────────────
create table if not exists daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  plan_date date not null,
  recovery_score numeric,
  recovery_tier text,
  recommended_workout_type text,
  recommended_intensity text,
  peloton_class_suggestion text,
  peloton_class_url text,
  reasoning jsonb,
  thinking_prompt text,
  thinking_prompt_answer text,
  actual_activity_id uuid references activities(id),
  plan_status text default 'planned',
  -- Portfolio daily check-in
  family_creative_done boolean default false,
  family_creative_note text,
  home_done boolean default false,
  home_note text,
  financial_done boolean default false,
  financial_note text,
  personal_done boolean default false,
  personal_note text,
  -- Drink tracking
  drinks_today integer default 0,
  mood_score integer check (mood_score between 1 and 5),
  morning_briefing text,
  briefing_generated_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, plan_date)
);

-- ─────────────────────────────────────────────
-- TODOS (house + truck, weather-aware, ordered)
-- ─────────────────────────────────────────────
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  category text not null check (category in ('house', 'truck')),
  title text not null,
  notes text,
  weather_required text default 'any' check (weather_required in ('any', 'dry', 'sunny')),
  effort text check (effort in ('quick', 'half_day', 'full_day', 'multi_day')),
  who_required text default 'solo',
  blocked_by uuid references todos(id),
  priority_order integer not null default 0,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- INBOX (brain dump — capture everything, triage later)
-- ─────────────────────────────────────────────
create table if not exists inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  content text not null,
  captured_at timestamptz default now(),
  processed boolean default false,
  processed_at timestamptz,
  converted_to text,
  converted_id uuid,
  notes text
);

create index if not exists idx_inbox_unprocessed on inbox_items(user_id, processed, captured_at desc);

-- ─────────────────────────────────────────────
-- PERSONAL TASKS
-- ─────────────────────────────────────────────
create table if not exists personal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  notes text,
  due_date date,
  priority_order integer default 0,
  status text default 'todo' check (status in ('todo', 'done')),
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- PERSISTENT REMINDERS (surfaces daily until done)
-- ─────────────────────────────────────────────
create table if not exists persistent_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  category text,
  urgency text default 'medium' check (urgency in ('low', 'medium', 'high')),
  surfaces_daily boolean default true,
  snoozed_until date,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- CALENDAR EVENTS (Google Calendar cache)
-- ─────────────────────────────────────────────
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  google_event_id text unique,
  title text,
  event_date date,
  start_time timestamptz,
  end_time timestamptz,
  event_type text default 'other',
  all_day boolean default false,
  synced_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- WEEKLY SUMMARIES (pre-computed nightly)
-- ─────────────────────────────────────────────
create table if not exists weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  week_start date not null,
  avg_weight_lbs numeric,
  avg_body_fat_pct numeric,
  avg_muscle_mass_pct numeric,
  total_miles_run numeric,
  total_workouts integer,
  total_duration_hours numeric,
  zone2_minutes integer,
  zone3plus_minutes integer,
  avg_rhr numeric,
  avg_sleep_score numeric,
  avg_drinks_per_day numeric,
  longest_run_miles numeric,
  best_pace_per_mile integer,
  mit_completion_pct numeric,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

-- ─────────────────────────────────────────────
-- ANNOTATIONS (milestone markers on charts)
-- ─────────────────────────────────────────────
create table if not exists annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  annotation_date date not null,
  label text not null,
  category text,
  note text,
  show_on_charts boolean default true,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- OAUTH TOKENS
-- ─────────────────────────────────────────────
create table if not exists oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  provider text not null check (provider in ('strava', 'withings', 'google')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

-- ─────────────────────────────────────────────
-- INSPIRATION PHOTOS
-- ─────────────────────────────────────────────
create table if not exists inspiration_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  taken_at date not null,
  location text,
  activity_type text check (activity_type in (
    'rafting', 'alpine', 'skiing', 'hiking', 'biking',
    'running', 'climbing', 'family', 'kids', 'travel', 'other'
  )),
  caption text,
  people text[],
  times_surfaced integer default 0,
  last_surfaced_at timestamptz,
  user_starred boolean default false,
  original_filename text,
  exif_data jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_inspiration_taken_at on inspiration_photos(taken_at);
create index if not exists idx_inspiration_user_surfaced on inspiration_photos(user_id, times_surfaced asc);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table users enable row level security;
alter table activities enable row level security;
alter table body_metrics enable row level security;
alter table recovery_signals enable row level security;
alter table program_tracker enable row level security;
alter table daily_plans enable row level security;
alter table todos enable row level security;
alter table inbox_items enable row level security;
alter table personal_tasks enable row level security;
alter table persistent_reminders enable row level security;
alter table calendar_events enable row level security;
alter table weekly_summaries enable row level security;
alter table annotations enable row level security;
alter table oauth_tokens enable row level security;
alter table inspiration_photos enable row level security;

-- Users can only read/write their own row
create policy "users: own row" on users
  for all using (auth.uid() = id);

-- Generic "own data" policies for all user-scoped tables
create policy "activities: own data" on activities
  for all using (auth.uid() = user_id);

create policy "body_metrics: own data" on body_metrics
  for all using (auth.uid() = user_id);

create policy "recovery_signals: own data" on recovery_signals
  for all using (auth.uid() = user_id);

create policy "program_tracker: own data" on program_tracker
  for all using (auth.uid() = user_id);

create policy "daily_plans: own data" on daily_plans
  for all using (auth.uid() = user_id);

create policy "todos: own data" on todos
  for all using (auth.uid() = user_id);

create policy "inbox_items: own data" on inbox_items
  for all using (auth.uid() = user_id);

create policy "personal_tasks: own data" on personal_tasks
  for all using (auth.uid() = user_id);

create policy "persistent_reminders: own data" on persistent_reminders
  for all using (auth.uid() = user_id);

create policy "calendar_events: own data" on calendar_events
  for all using (auth.uid() = user_id);

create policy "weekly_summaries: own data" on weekly_summaries
  for all using (auth.uid() = user_id);

create policy "annotations: own data" on annotations
  for all using (auth.uid() = user_id);

create policy "oauth_tokens: own data" on oauth_tokens
  for all using (auth.uid() = user_id);

create policy "inspiration_photos: own data" on inspiration_photos
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- SEED DATA — Ben Wright
-- Note: Replace USER_UUID after first sign-in.
-- The app will upsert this row on first login via the auth hook.
-- ─────────────────────────────────────────────

-- Seed annotations (milestone markers — not user-scoped, pre-populated)
-- These will be linked to Ben's user_id on first login via app logic.
-- For now, store them with a placeholder that the app replaces.
-- (Actual insert happens in the app after auth.uid() is known.)
