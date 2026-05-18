-- visceral_fat was declared integer in migration 001 but the Body Comp scale
-- returns one-decimal-place values (4.0, 4.1, 4.2 ...), so the backfill failed
-- with "invalid input syntax for type integer". Widen to numeric.

alter table body_metrics alter column visceral_fat type numeric;
