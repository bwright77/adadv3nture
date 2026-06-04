-- Correct the West Line Winder anchor-event distance note to the verified course
-- (18.1 mi / 2,450 ft). Migration 047 fixed training_goals, but the anchor_events
-- row — which feeds the Trends anchor card and the Labor Day-style countdown —
-- still read "18.6mi" from the 024 seed. Substring replace preserves the rest of
-- the note ("· 48th bday wknd"); guarded so it only touches the stale value.

update anchor_events
set notes = replace(notes, '18.6mi', '18.1mi')
where slug = 'wlw' and notes like '%18.6mi%';
