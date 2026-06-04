-- Split the Home category across the two houses: Birch St (Denver, primary) and
-- Yellow House (Howard, secondary). Only meaningful for home-category todos.
-- Runs after 045, so the truck todos are already gone — this backfills only the
-- actual house work, defaulting to the primary residence (Birch).

alter table todos add column if not exists home_site text
  check (home_site in ('birch', 'yellow_house'));

update todos set home_site = 'birch'
  where category = 'home' and home_site is null;
