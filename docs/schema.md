# Database Schema

**Migrations applied:** 001–022 (run `npx supabase db push` to apply new ones — no Docker needed)

```sql
-- USERS
create table users (
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

-- ACTIVITIES (unified — Strava + manual)
create table activities (
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

-- BODY METRICS (Withings Body Comp + manual)
create table body_metrics (
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

-- RECOVERY SIGNALS (Apple Health + manual)
create table recovery_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  signal_date date not null,
  rhr integer,
  hrv_ms numeric,
  sleep_score integer,
  sleep_duration_hours numeric,    -- null if watch charged overnight. NOT zero.
  drinks_consumed integer default 0, -- integer not boolean. Goal ≤ 2/day avg.
  source text default 'apple_health',
  recovery_score numeric,
  recovery_tier text,              -- 'go_hard' | 'moderate' | 'recovery' | 'unknown'
  created_at timestamptz default now(),
  unique(user_id, signal_date)
);

-- PROGRAM TRACKER (prescription only — Strava handles logging)
create table program_tracker (
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
  image_url text,
  created_at timestamptz default now()
);

-- HIKES (50 Hikes with Kids: Colorado — Gorton & Tillack)
create table hikes_50 (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references users(id) on delete cascade,
  book_number          integer not null,
  name                 text not null,
  region               text,
  hub                  text,
  distance_mi          numeric(4,2),
  difficulty           text check (difficulty in ('easy','moderate','challenging')),
  elevation_gain_ft    integer,
  highlights           text,
  drive_minutes_denver integer,
  best_months          text[],
  alltrails_url        text,
  trailhead_lat        numeric(9,6),
  trailhead_lng        numeric(9,6),
  done                 boolean default false,
  date_done            date,
  strava_activity_id   bigint,
  family_rating        integer check (family_rating between 1 and 5),
  notes                text,
  created_at           timestamptz default now(),
  unique(user_id, book_number)
);

-- WEEKEND PLANS (one row per day — manual entry via WAdventureToday / PlanDaySheet)
create table weekend_plans (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users(id) on delete cascade,
  plan_date      date not null,
  activity_type  text,           -- 'run' | 'ride' | 'ski' | 'hike' | 'family' | 'project' | 'other'
  title          text,
  location       text,
  departure_time time,
  notes          text,
  created_at     timestamptz default now(),
  unique(user_id, plan_date)
);

-- WEEKEND SPOTS (curated family/adventure destinations for WFamilyDay + WAdventureToday)
create table weekend_spots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade,
  name          text not null,
  type          text not null check (type in ('trail', 'park', 'ski', 'bike', 'family', 'run')),
  location      text,
  latitude      float,
  longitude     float,
  age_min       integer default 0,
  drive_minutes integer,
  notes         text,
  created_at    timestamptz default now()
);

-- DAILY PLANS
create table daily_plans (
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
  family_creative_done boolean default false,
  family_creative_note text,
  home_done boolean default false,
  home_note text,
  financial_done boolean default false,
  financial_note text,
  personal_done boolean default false,
  personal_note text,
  drinks_today integer default 0,
  mood_score integer check (mood_score between 1 and 5),
  morning_briefing text,
  briefing_generated_at timestamptz,
  -- weekend briefing variant (migration 021)
  weekend_briefing text,
  weekend_thinking_prompt text,
  weekend_briefing_generated_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, plan_date)
);

-- TODOS
-- category: ('body', 'career', 'family', 'home', 'personal')
-- urgency: 'fire' | 'deck' | 'rain' (migration 009)
-- UI tabs: TRAINING (event view), CAREER, FAMILY, HOME, PROJECTS (project view)
create table todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  category text not null check (category in ('body', 'career', 'family', 'home', 'personal')),
  title text not null,
  notes text,
  urgency text check (urgency in ('fire', 'deck', 'rain')),
  weather_required text default 'any' check (weather_required in ('any', 'dry', 'sunny')),
  effort text check (effort in ('quick', 'half_day', 'full_day', 'multi_day')),
  who_required text default 'solo',
  blocked_by uuid references todos(id),
  priority_order integer not null default 0,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- INBOX
create table inbox_items (
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

-- PERSONAL TASKS
create table personal_tasks (
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

-- PERSISTENT REMINDERS
create table persistent_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  category text,
  urgency text default 'medium',
  surfaces_daily boolean default true,
  snoozed_until date,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- CALENDAR EVENTS (Google Calendar cache)
create table calendar_events (
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

-- WEEKLY SUMMARIES (pre-computed nightly)
create table weekly_summaries (
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

-- ANNOTATIONS (milestone markers on trend charts)
create table annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  annotation_date date not null,
  label text not null,
  category text,
  note text,
  show_on_charts boolean default true,
  created_at timestamptz default now()
);
-- Seeds: GLP-1 Nov 2024, Anniversary Jun 2025, Boot Camp May 11 2026,
--        Labor Day Sep 1 2026, West Line Winder Sep 26 2026

-- TRAINING GOALS
create table training_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  event_name text not null,
  event_date date not null,
  event_type text check (event_type in ('trail_run', 'cycling_road', 'cycling_gravel')),
  distance_label text,
  elevation_label text,
  location text,
  is_anchor boolean default false,
  status text default 'active' check (status in ('active', 'complete', 'skipped')),
  notes text,
  image_url text,
  website_url text,
  created_at timestamptz default now()
);

-- TRAINING WEEKS
create table training_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  week_start date not null,
  phase_label text not null,
  target_run_miles numeric,
  target_long_run_miles numeric,
  target_cycling_miles numeric,
  target_strength_sessions integer,
  actual_run_miles numeric,
  actual_cycling_miles numeric,
  actual_strength_sessions integer,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

-- PROJECTS
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  description text,
  category text check (category in ('art', 'software', 'home', 'career', 'other')),
  deadline_date date,
  soft_deadline_date date,
  progress_pct integer default 0 check (progress_pct between 0 and 100),
  next_action text,
  status text default 'active' check (status in ('active', 'complete', 'paused', 'dead')),
  image_url text,
  website_url text,
  created_at timestamptz default now()
);

create table project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  done boolean default false,
  done_at timestamptz,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  note text not null,
  created_at timestamptz default now()
);

create table project_contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  title text,
  relationship_note text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- OAUTH TOKENS
create table oauth_tokens (
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

-- INSPIRATION PHOTOS
create table inspiration_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  taken_at date not null,
  location text,
  activity_type text,
  caption text,
  people text[],
  times_surfaced integer default 0,
  last_surfaced_at timestamptz,
  user_starred boolean default false,
  original_filename text,
  exif_data jsonb,
  created_at timestamptz default now()
);
create index idx_inspiration_taken_at on inspiration_photos(taken_at);
```
