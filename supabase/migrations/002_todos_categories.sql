-- Update todos category constraint: house/truck → body/career/family/home/personal
alter table todos drop constraint todos_category_check;
alter table todos add constraint todos_category_check
  check (category in ('body', 'career', 'family', 'home', 'personal'));
