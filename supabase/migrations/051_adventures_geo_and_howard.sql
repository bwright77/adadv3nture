-- De-Denver the adventure catalog.
--
-- (1) The 50 hike-derived adventures were seeded (migration 041) with NULL
--     coordinates and a blanket place_slug='denver'. NULL coords make the
--     geo-suggester treat them as "always near" (so Denver hikes surface in
--     Howard), and 'denver' wrongly gives far hikes the at-place boost. Backfill
--     real coords from family_hikes (now populated) and drop the place tag so
--     haversine distance is the sole gate.
-- (2) Seed Howard / Arkansas-valley adventures so the hero has something to
--     suggest when Ben's at the grandparents' place near Salida.

update adventures a
set latitude    = h.trailhead_lat,
    longitude   = h.trailhead_lng,
    place_slug  = null
from family_hikes h
where a.user_id = h.user_id
  and a.name = h.name
  and a.category = 'hike'
  and a.latitude is null
  and h.trailhead_lat is not null;

-- Howard-area family adventures (Arkansas valley, ~20–30 min from Howard).
insert into adventures
  (user_id, name, category, place_slug, relief, latitude, longitude, drive_minutes,
   setting, is_water, best_months, age_min, notes)
select u.id, v.name, v.category, 'howard', 'grandparents', v.lat, v.lng, v.drive,
       v.setting, v.is_water, v.best_months, 0, v.notes
from users u
cross join (values
  ('Mt Princeton Hot Springs', 'pool',  38.7307, -106.1605, 35, 'mixed',   true,
    array['May','Jun','Jul','Aug','Sep','Oct'], 'Creekside hot pools at Nathrop — kids love the riverside soak.'),
  ('Salida Hot Springs Aquatic Center', 'pool', 38.5247, -105.9988, 20, 'mixed', true,
    array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], 'Big indoor/outdoor hot-spring pool in town — all-weather backup.'),
  ('Tenderfoot ("S") Mountain Trail', 'hike', 38.5443, -105.9911, 20, 'outdoor', false,
    array['Apr','May','Jun','Jul','Aug','Sep','Oct'], 'Short Salida classic with the big-S overlook of the Arkansas valley.'),
  ('Salida Riverside / Arkansas River play', 'creek', 38.5310, -105.9990, 20, 'outdoor', true,
    array['Jun','Jul','Aug'], 'Riverside park + wave for splashing, rock-hopping, and a picnic in town.'),
  ('Browns Canyon (Ruby Mountain)', 'hike', 38.6925, -106.0436, 25, 'outdoor', false,
    array['May','Jun','Jul','Aug','Sep','Oct'], 'National monument trails + river access; bighorn and granite.'),
  ('Buena Vista River Park', 'parks', 38.8422, -106.1311, 35, 'outdoor', true,
    array['Jun','Jul','Aug','Sep'], 'Whitewater play park, boulders, and the Collegiate Peaks backdrop.')
) as v(name, category, lat, lng, drive, setting, is_water, best_months, notes)
where u.email = 'benw21@gmail.com'
  and not exists (
    select 1 from adventures a where a.user_id = u.id and a.name = v.name
  );
