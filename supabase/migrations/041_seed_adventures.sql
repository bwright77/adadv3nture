-- Summer Mode — seed the adventure catalog from existing data so nothing is double-entered.
-- weekend_spots and hikes_50 keep working unchanged (coexist now, converge later); this just
-- ports their rows into the generalized `adventures` catalog.

-- From weekend_spots: map the fixed type enum into adventure categories.
insert into adventures
  (user_id, name, category, setting, latitude, longitude, drive_minutes, age_min, notes)
select
  user_id,
  name,
  case type
    when 'trail'  then 'hike'
    when 'park'   then 'parks'
    else 'other'                  -- ski / bike / family / run → other (no closer category yet)
  end,
  case type
    when 'family' then 'mixed'
    else 'outdoor'
  end,
  latitude,
  longitude,
  drive_minutes,
  coalesce(age_min, 0),
  notes
from weekend_spots;

-- From hikes_50: every hike is a Denver-area outdoor adventure with seasonal months.
insert into adventures
  (user_id, name, category, place_slug, setting, latitude, longitude,
   drive_minutes, best_months, notes)
select
  user_id,
  name,
  'hike',
  'denver',
  'outdoor',
  trailhead_lat,
  trailhead_lng,
  drive_minutes_denver,
  best_months,
  notes
from hikes_50;
