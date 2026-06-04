-- Re-home Elsie. The FJ62 truck was seeded as ~16 Home todos under the old
-- "Home = house + truck" portfolio model (008_seed_todos). The truck is a side
-- project like the Bottle Cap Bike and the app — so move those todos into the
-- FJ62 project (find it, or create it) as milestones, and clear them out of Home.
-- Idempotent: milestone inserts are guarded by title; re-running is a no-op.

do $$
declare
  v_user    uuid;
  v_project uuid;
  r         record;
  v_clean   text;
begin
  -- Owner of the truck todos (single-user app).
  select user_id into v_user
  from todos
  where category = 'home' and (title ilike 'Truck:%' or title ilike '[TRUCK]%')
  limit 1;

  if v_user is null then
    return;  -- nothing to migrate
  end if;

  -- Find Elsie's project (any earlier-tagged one), else create it.
  select id into v_project
  from projects
  where user_id = v_user and (title ~* 'fj62|elsie|land cruiser|v3ntrus|truck')
  order by created_at
  limit 1;

  if v_project is null then
    insert into projects (user_id, title, description, category, status)
    values (
      v_user,
      'FJ62 "Elsie"',
      '1988 Toyota FJ62 Land Cruiser (plate V3NTRUS). Restoration + upgrades.',
      'other',
      'active'
    )
    returning id into v_project;
  end if;

  -- Each truck todo -> a milestone (strip the "Truck:" / "[TRUCK]" prefix).
  for r in
    select title, status, completed_at, priority_order
    from todos
    where user_id = v_user and category = 'home'
      and (title ilike 'Truck:%' or title ilike '[TRUCK]%')
    order by priority_order
  loop
    v_clean := trim(regexp_replace(r.title, '^\[?TRUCK\]?:?\s*', '', 'i'));
    insert into project_milestones (project_id, title, done, done_at, sort_order)
    select v_project, v_clean, (r.status = 'done'),
           case when r.status = 'done' then coalesce(r.completed_at, now()) else null end,
           coalesce(r.priority_order, 0)
    where not exists (
      select 1 from project_milestones m
      where m.project_id = v_project and m.title = v_clean
    );
  end loop;

  -- Remove the truck todos from Home now that they're milestones.
  delete from todos
  where user_id = v_user and category = 'home'
    and (title ilike 'Truck:%' or title ilike '[TRUCK]%');

  -- Reflect milestone completion on the project's progress bar.
  update projects p set progress_pct = coalesce(sub.pct, 0)
  from (
    select project_id,
           round(100.0 * count(*) filter (where done) / nullif(count(*), 0)) as pct
    from project_milestones where project_id = v_project group by project_id
  ) sub
  where p.id = sub.project_id;
end $$;
