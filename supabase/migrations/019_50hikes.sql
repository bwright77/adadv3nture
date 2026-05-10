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

alter table hikes_50 enable row level security;

create policy "owner only" on hikes_50
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
