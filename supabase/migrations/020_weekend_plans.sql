create table weekend_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete cascade,
  plan_date    date not null,
  activity_type text,
  title        text,
  location     text,
  departure_time time,
  notes        text,
  created_at   timestamptz default now(),
  unique(user_id, plan_date)
);

alter table weekend_plans enable row level security;

create policy "owner only" on weekend_plans
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
