-- Add urgency tier to todos
alter table todos
  add column if not exists urgency text not null default 'deck'
    check (urgency in ('fire', 'deck', 'rain'));

comment on column todos.urgency is
  'fire = do it now, deck = on deck / this week, rain = save for a rainy day';
