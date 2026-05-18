-- One-off cleanup for the Withings sync shape: a single weigh-in event was
-- being stored as multiple rows (one per Withings measuregroup) sharing a
-- `measured_at` timestamp. Only one of those rows held the weight value, the
-- rest had weight_lbs=null with the other body-comp fields populated. Briefing
-- queries that did "ORDER BY measured_at DESC LIMIT 1" therefore returned a
-- null-weight row most of the time.
--
-- Going forward `syncBodyMetrics` merges measuregroups by date into one row
-- per weigh-in, and the new unique index prevents the multi-row shape from
-- recurring. The withings_id column was only ever used for dedup against the
-- per-measuregroup grpid — the unique index on (user, measured_at, source)
-- handles that more correctly, so the column is dropped.

-- Step 1: Merge non-null values into the lowest-id row of each partition.
with grouped as (
  select
    user_id, measured_at, source,
    (array_agg(id order by created_at, id))[1] as keep_id,
    (array_agg(weight_lbs      order by created_at, id) filter (where weight_lbs      is not null))[1] as weight_lbs,
    (array_agg(body_fat_pct    order by created_at, id) filter (where body_fat_pct    is not null))[1] as body_fat_pct,
    (array_agg(muscle_mass_lbs order by created_at, id) filter (where muscle_mass_lbs is not null))[1] as muscle_mass_lbs,
    (array_agg(muscle_mass_pct order by created_at, id) filter (where muscle_mass_pct is not null))[1] as muscle_mass_pct,
    (array_agg(bone_mass_lbs   order by created_at, id) filter (where bone_mass_lbs   is not null))[1] as bone_mass_lbs,
    (array_agg(water_pct       order by created_at, id) filter (where water_pct       is not null))[1] as water_pct,
    (array_agg(bmi             order by created_at, id) filter (where bmi             is not null))[1] as bmi,
    (array_agg(visceral_fat    order by created_at, id) filter (where visceral_fat    is not null))[1] as visceral_fat,
    (array_agg(bmr             order by created_at, id) filter (where bmr             is not null))[1] as bmr
  from body_metrics
  group by user_id, measured_at, source
  having count(*) > 1
)
update body_metrics b
set
  weight_lbs      = g.weight_lbs,
  body_fat_pct    = g.body_fat_pct,
  muscle_mass_lbs = g.muscle_mass_lbs,
  muscle_mass_pct = g.muscle_mass_pct,
  bone_mass_lbs   = g.bone_mass_lbs,
  water_pct       = g.water_pct,
  bmi             = g.bmi,
  visceral_fat    = g.visceral_fat,
  bmr             = g.bmr
from grouped g
where b.id = g.keep_id;

-- Step 2: Delete the now-redundant rows. Survivor matches step 1: the row
-- with the smallest (created_at, id) tuple in each partition stays; anything
-- with a strictly smaller-than-self companion in the same group is deleted.
delete from body_metrics b
where exists (
  select 1 from body_metrics b2
  where b2.user_id = b.user_id
    and b2.measured_at = b.measured_at
    and b2.source = b.source
    and (b2.created_at, b2.id) < (b.created_at, b.id)
);

-- Step 3: Drop the per-measuregroup id column; dedup now happens by timestamp.
alter table body_metrics drop column if exists withings_id;

-- Step 4: Enforce one-row-per-weigh-in going forward.
create unique index if not exists body_metrics_user_measured_source_uniq
  on body_metrics (user_id, measured_at, source);
