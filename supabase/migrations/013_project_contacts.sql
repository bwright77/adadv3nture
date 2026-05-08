-- Add 'dead' status to projects
alter table projects drop constraint if exists projects_status_check;
alter table projects add constraint projects_status_check
  check (status in ('active', 'complete', 'paused', 'dead'));

-- Contacts per project (key people, relationships)
create table project_contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  title text,
  relationship_note text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create index idx_project_contacts_project_id on project_contacts(project_id);
alter table project_contacts enable row level security;
create policy "Users manage their project contacts" on project_contacts
  using (exists (
    select 1 from projects where projects.id = project_id and projects.user_id = auth.uid()
  ));
