alter table training_goals  add column if not exists image_url text;
alter table program_tracker add column if not exists image_url text;
alter table projects        add column if not exists image_url text;
