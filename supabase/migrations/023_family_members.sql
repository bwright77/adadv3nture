-- family_members — single source of truth for self, spouse, kids
-- Replaces hardcoded KIDS arrays in WKids / WFamilyDay
-- user_id: a2bcae76-355c-4771-949f-2a5928b056ff (Ben)

create table if not exists family_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  name        text not null,
  role        text not null check (role in ('self', 'spouse', 'child')),
  birthday    date not null,
  emoji       text,
  vibe        text,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

create index if not exists family_members_user_role_idx on family_members(user_id, role);

alter table family_members enable row level security;

create policy "owner only" on family_members
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Seed: Ben's household
insert into family_members (user_id, name, role, birthday, emoji, vibe, sort_order) values
  ('a2bcae76-355c-4771-949f-2a5928b056ff', 'Ben',     'self',   '1977-09-22', '🧔', null, 0),
  ('a2bcae76-355c-4771-949f-2a5928b056ff', 'Tangier', 'spouse', '1983-02-27', '💛', null, 1),
  ('a2bcae76-355c-4771-949f-2a5928b056ff', 'Chase',   'child',  '2017-10-31', '🏀', 'hoops · throw the ball · trail challenge',         10),
  ('a2bcae76-355c-4771-949f-2a5928b056ff', 'Ada',     'child',  '2019-04-29', '🐒', 'ninja course · climb something · self-sufficient',  11),
  ('a2bcae76-355c-4771-949f-2a5928b056ff', 'Sylvia',  'child',  '2021-04-28', '🔧', 'needs engagement · loves helping · good truck helper', 12)
on conflict do nothing;
