-- SECURITY FIX — RLS was missing on five tables created in migrations 010
-- (training_goals, training_weeks) and 011 (projects, project_milestones,
-- project_updates). Supabase flagged it as "Table publicly accessible:
-- anyone with your project URL can read, edit, and delete all data."
--
-- All five tables now get RLS + owner-only policies. Child tables
-- (project_milestones, project_updates) check ownership through their
-- parent project — same pattern that project_contacts already uses
-- (migration 013).

-- ── projects ──────────────────────────────────────────────────────────
alter table projects enable row level security;

create policy "owner only" on projects
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── project_milestones (owner-via-parent-project) ─────────────────────
alter table project_milestones enable row level security;

create policy "owner only" on project_milestones
  using (exists (
    select 1 from projects
    where projects.id = project_milestones.project_id
      and projects.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from projects
    where projects.id = project_milestones.project_id
      and projects.user_id = auth.uid()
  ));

-- ── project_updates (owner-via-parent-project) ────────────────────────
alter table project_updates enable row level security;

create policy "owner only" on project_updates
  using (exists (
    select 1 from projects
    where projects.id = project_updates.project_id
      and projects.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from projects
    where projects.id = project_updates.project_id
      and projects.user_id = auth.uid()
  ));

-- ── training_goals ────────────────────────────────────────────────────
alter table training_goals enable row level security;

create policy "owner only" on training_goals
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── training_weeks ────────────────────────────────────────────────────
alter table training_weeks enable row level security;

create policy "owner only" on training_weeks
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
