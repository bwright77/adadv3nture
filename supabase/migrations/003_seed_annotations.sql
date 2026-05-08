-- Seed milestone annotations for Ben Wright
-- User ID: a2bcae76-355c-4771-949f-2a5928b056ff

insert into annotations (user_id, annotation_date, label, category, note, show_on_charts)
values
  ('a2bcae76-355c-4771-949f-2a5928b056ff', '2024-11-01', 'GLP-1 Start',      'health',   'Started GLP-1, November 2024', true),
  ('a2bcae76-355c-4771-949f-2a5928b056ff', '2025-06-01', 'Anniversary',       'personal', 'Ben + Tangier anniversary', true),
  ('a2bcae76-355c-4771-949f-2a5928b056ff', '2026-05-08', 'Boot Camp',         'fitness',  'Total Strength W1D1 — run base + strength phase begins', true),
  ('a2bcae76-355c-4771-949f-2a5928b056ff', '2026-09-01', 'Labor Day',         'career',   'Fish or cut bait — WA income or get a real job', true),
  ('a2bcae76-355c-4771-949f-2a5928b056ff', '2026-09-26', 'West Line Winder',  'fitness',  '30K trail race, Buena Vista CO — birthday weekend anchor', true)
on conflict do nothing;
