-- Summer Mode — adventure catalog + two-tier completion log.
-- Generalizes hikes_50 / weekend_spots into a choose-your-own-adventure suggester
-- across all adventure types. v1 uses category + place + setting/water + seasonal +
-- age; mood_fit / attributes are nullable and inert until v2 scoring.

create table adventures (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade,
  name          text not null,
  category      text not null check (category in
                  ('pool','fishing','library','parks','museum','bouldering','creek','hike','other')),
  place_slug    text,            -- 'denver'|'howard'|'greeley'|'evans'|'camp' (locations.ts)
  relief        text check (relief in ('grandparents','in_laws','home','free')),  -- per-row override; place is authoritative
  latitude      numeric(9,6),
  longitude     numeric(9,6),
  drive_minutes integer,
  setting       text not null default 'outdoor' check (setting in ('indoor','outdoor','mixed')),
  is_water      boolean default false,
  best_months   text[],          -- reuse hikes_50 seasonal pattern ('Jun','Jul',...)
  age_min       integer default 0,
  age_max       integer,
  duration_mins integer,
  mood_fit      text[],          -- v2 scoring (inert in v1)
  attributes    text[],          -- v2 free tags (inert in v1)
  notes         text,
  active        boolean default true,
  created_at    timestamptz default now()
);

alter table adventures enable row level security;

create policy "owner only" on adventures
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index adventures_user_cat_idx on adventures(user_id, category) where active;

-- Tier 1 "we got out" — a daily boolean on daily_plans (reuses the registerMITActivity
-- plumbing; lights the everyday-adventure heartbeat).
alter table daily_plans add column if not exists adventure_done boolean default false;
alter table daily_plans add column if not exists adventure_note text;
alter table daily_plans add column if not exists adventure_category text;

-- Tier 2 "real adventure" — durable season memory artifact, one row per logged outing.
-- A weekly is_real marker is the celebratory star; gaps never reset (not a streak).
create table adventure_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade,
  adventure_id  uuid references adventures(id) on delete set null,  -- ad-hoc outings allowed (null)
  done_date     date not null,
  category      text not null,          -- denormalized: survives catalog deletion
  is_real       boolean default false,  -- the weekly celebratory marker (manual tick)
  relief        text,
  family_rating integer check (family_rating between 1 and 5),
  notes         text,
  created_at    timestamptz default now()
);

alter table adventure_log enable row level security;

create policy "owner only" on adventure_log
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index adventure_log_user_date_idx on adventure_log(user_id, done_date);
