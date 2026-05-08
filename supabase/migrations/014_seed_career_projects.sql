-- Seed career projects for Ben Wright
-- user_id: a2bcae76-355c-4771-949f-2a5928b056ff

do $$
declare
  uid uuid := 'a2bcae76-355c-4771-949f-2a5928b056ff';
  pfb_id uuid;
  jj_id uuid;
  confluence_id uuid;
  best_id uuid;
begin

  -- PeopleForBikes / BIDE AI
  insert into projects (user_id, title, description, category, progress_pct, next_action, status)
  values (uid,
    'PeopleForBikes / BIDE',
    'AI intelligence layer for the BIDE industry data platform — conversational query, personalized market intel, strategic advisor.',
    'career', 30,
    'Wait for Jenn''s response; then schedule data team call with José + Liam',
    'active')
  returning id into pfb_id;

  insert into project_contacts (project_id, name, title, relationship_note, sort_order) values
    (pfb_id, 'Jenn Dice', 'CEO, PeopleForBikes', 'Tangier''s boss — personal connection', 0);

  insert into project_milestones (project_id, title, done, done_at, sort_order) values
    (pfb_id, 'Pre-meeting email sent', true, now(), 0),
    (pfb_id, 'Informational meeting with Jenn', true, now(), 1),
    (pfb_id, 'Follow-up email + WA one-pager sent', true, now(), 2),
    (pfb_id, 'Jenn signals interest / responds', false, null, 3),
    (pfb_id, 'Data team call (José + Liam)', false, null, 4),
    (pfb_id, 'Share BIDE scoping proposal', false, null, 5),
    (pfb_id, 'Colorado Nonprofit Association intro', false, null, 6);

  -- Jennifer (JJ) Johnson Trout / Golden Trout Rising
  insert into projects (user_id, title, description, category, progress_pct, next_action, status)
  values (uid,
    'Golden Trout Rising',
    'Nonprofit strategy + systems — potential partnership with JJ on capacity-building work.',
    'career', 0,
    'Initial discovery call to define fit',
    'active')
  returning id into jj_id;

  insert into project_contacts (project_id, name, title, relationship_note, sort_order) values
    (jj_id, 'Jennifer (JJ) Johnson Trout', 'Nonprofit Executive, Strategy + Systems Leader', 'Golden Trout Rising — leadership coach, mission-driven orgs', 0);

  insert into project_milestones (project_id, title, done, done_at, sort_order) values
    (jj_id, 'Initial discovery call', false, null, 0),
    (jj_id, 'Define partnership scope', false, null, 1);

  -- Confluence Colorado (active engagement)
  insert into projects (user_id, title, description, category, progress_pct, next_action, status)
  values (uid,
    'Confluence Colorado',
    'Active ongoing engagement.',
    'career', 0,
    'Map current milestones and status',
    'active')
  returning id into confluence_id;

  -- Best Apartments / Richard Jensen
  insert into projects (user_id, title, description, category, progress_pct, next_action, status)
  values (uid,
    'Best Apartments',
    'Opportunity to define and scope.',
    'career', 0,
    'Define opportunity scope with Richard',
    'active')
  returning id into best_id;

  insert into project_contacts (project_id, name, title, relationship_note, sort_order) values
    (best_id, 'Richard Jensen', 'Best Apartments', null, 0);

end $$;
