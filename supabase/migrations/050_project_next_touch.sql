-- Career opportunities are relationship-driven, not deadline-driven — most have
-- no "apply by" date, they need a "circle back by" nudge. Add a next_touch_date
-- for that. Hard/soft deadlines stay for real deadline-bearing projects (the
-- bike show, etc.); career cards/detail use next_touch_date instead.

alter table projects add column if not exists next_touch_date date;
