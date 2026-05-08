create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('art', 'software', 'home', 'career', 'other')),
  deadline_date date,
  soft_deadline_date date,
  progress_pct integer default 0 check (progress_pct between 0 and 100),
  next_action text,
  status text default 'active' check (status in ('active', 'complete', 'paused')),
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
