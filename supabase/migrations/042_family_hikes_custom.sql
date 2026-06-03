-- "Family Hikes" — the tracker grows beyond the original book 50.
-- Rename the table to match the feature, and let it hold family-added hikes:
-- custom entries have no book number (flagged is_custom). book_number stays
-- unique per user (Postgres treats NULLs as distinct, so many customs coexist).
-- RLS policy, indexes and the unique constraint all follow the table through
-- the rename.

alter table hikes_50 rename to family_hikes;
alter table family_hikes add column if not exists is_custom boolean default false;
alter table family_hikes alter column book_number drop not null;
