-- briefing_profile — narrative facts the morning briefing prompt needs.
-- Replaces hardcoded "About Ben" lines in the Edge Function system prompt.
-- Shape (all optional):
--   identity           text   — one-line who-am-I
--   current_focus      text   — what's the active thing he's building
--   health_context     text[] — durable medical / fitness facts (GLP-1, weight target, etc.)
--   goals              text[] — durable goals (drink ratio, sleep target, etc.)
--   tone_notes         text[] — voice nudges ("external accountability works", etc.)
--   weekend_identity   text   — weekend voice/identity sentence

alter table users
  add column if not exists briefing_profile jsonb not null default '{}'::jsonb;

-- Seed Ben's profile from what was previously hardcoded in
-- supabase/functions/morning-briefing/index.ts.
update users set briefing_profile = jsonb_build_object(
  'identity',         '48yo dad in Denver CO',
  'current_focus',    'Building Wright Adventures — software for good, working for himself',
  'health_context',   jsonb_build_array(
                        'GLP-1 since Nov 2024',
                        'Target 178-182 lbs'
                      ),
  'goals',            jsonb_build_array(
                        'Drink ratio ≤ 2/day average. Not a streak — a ratio.'
                      ),
  'tone_notes',       jsonb_build_array(
                        'External accountability works better than abstract goals.',
                        '"Why bother" creeps in when progress stalls — counter with specific action.'
                      ),
  'weekend_identity', 'Big rides, long hikes, 14ers, ski tours — this is who he is when work falls away.'
)
where id = 'a2bcae76-355c-4771-949f-2a5928b056ff';
