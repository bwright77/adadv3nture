-- Seed drinks: May 6 = 1, May 7 = 0
insert into recovery_signals (user_id, signal_date, drinks_consumed, source)
values
  ('a2bcae76-355c-4771-949f-2a5928b056ff', '2026-05-06', 1, 'manual'),
  ('a2bcae76-355c-4771-949f-2a5928b056ff', '2026-05-07', 0, 'manual')
on conflict (user_id, signal_date)
do update set drinks_consumed = excluded.drinks_consumed;
