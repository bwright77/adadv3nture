create table weekend_spots (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete cascade,
  name         text not null,
  type         text not null check (type in ('trail', 'park', 'ski', 'bike', 'family', 'run')),
  location     text,
  latitude     float,
  longitude    float,
  age_min      integer default 0,
  drive_minutes integer,
  notes        text,
  created_at   timestamptz default now()
);

alter table weekend_spots enable row level security;

create policy "owner only" on weekend_spots
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
