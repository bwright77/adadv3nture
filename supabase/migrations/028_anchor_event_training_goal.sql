-- Link anchor_events rows to the corresponding training_goals row so the
-- Trends anchor card can deep-link straight to the event's detail view in
-- the Training tab without doing string-matching at runtime.
--
-- Nullable + ON DELETE SET NULL — anchors and goals stay decoupled if the
-- user deletes the underlying training_goal (the anchor countdown still
-- works, the deep-link button just doesn't render).

alter table anchor_events
  add column if not exists training_goal_id uuid references training_goals(id) on delete set null;

create index if not exists anchor_events_training_goal_idx
  on anchor_events(training_goal_id);

-- Backfill: link Ben's WLW anchor to his West Line Winder training_goal.
-- Matches by event_name LIKE so the seeded name "West Line Winder 30K"
-- matches the anchor's title "West Line Winder 30K".
update anchor_events
set training_goal_id = (
  select id from training_goals
  where training_goals.user_id = anchor_events.user_id
    and training_goals.event_name ilike 'west line winder%'
  order by training_goals.event_date
  limit 1
)
where slug = 'wlw' and training_goal_id is null;
