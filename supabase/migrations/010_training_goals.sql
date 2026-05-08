create table training_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  event_name text not null,
  event_date date not null,
  event_type text not null check (event_type in ('trail_run', 'cycling_road', 'cycling_gravel')),
  distance_label text,
  elevation_label text,
  location text,
  is_anchor boolean default false,
  status text default 'active' check (status in ('active', 'complete', 'skipped')),
  notes text,
  created_at timestamptz default now()
);

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
