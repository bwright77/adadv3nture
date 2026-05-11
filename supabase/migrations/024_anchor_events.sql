-- anchor_events — dated lifeplan anchors (races, decision dates, milestones)
-- Replaces hardcoded dates scattered across WEvent, WLaborDay, WMorningHero,
-- MorningView/WeekendDawnView LockStrips, and lib/trends.ts.
--
-- Slugs are stable code-side identifiers; titles/dates/locations are user-editable.

create table if not exists anchor_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  slug        text not null,
  title       text not null,
  event_date  date not null,
  location    text,
  notes       text,
  category    text,        -- training / career / family / etc.
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, slug)
);

create index if not exists anchor_events_user_date_idx on anchor_events(user_id, event_date);

alter table anchor_events enable row level security;

create policy "owner only" on anchor_events
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed: Ben's two anchors
insert into anchor_events (user_id, slug, title, event_date, location, notes, category) values
  ('a2bcae76-355c-4771-949f-2a5928b056ff', 'wlw',        'West Line Winder 30K', '2026-09-26', 'Buena Vista', '18.6mi · 48th bday wknd',         'training'),
  ('a2bcae76-355c-4771-949f-2a5928b056ff', 'labor_day',  'Wright Adventures',    '2026-09-01', null,          'WA income or get a real job',     'career')
on conflict (user_id, slug) do nothing;
