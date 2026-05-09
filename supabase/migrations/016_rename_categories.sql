-- Rename daily_plans columns: financial → career, personal → projects
alter table daily_plans rename column financial_done to career_done;
alter table daily_plans rename column financial_note to career_note;
alter table daily_plans rename column personal_done to projects_done;
alter table daily_plans rename column personal_note to projects_note;

-- Update todos category constraint: personal → projects
alter table todos drop constraint todos_category_check;

-- Migrate existing data before re-adding constraint
update todos set category = 'projects' where category = 'personal';

alter table todos add constraint todos_category_check
  check (category in ('body', 'career', 'family', 'home', 'projects'));
