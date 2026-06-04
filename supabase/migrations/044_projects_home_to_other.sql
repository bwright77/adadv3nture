-- Retire the 'home' project category. A project is a side project (art,
-- software, the truck/FJ62, etc.) — house work (Birch St / Yellow House) lives
-- in the Home *todo* list, never as a project. Move any home-tagged projects to
-- the neutral 'other' label so their card reads right; the MIT router already
-- credits every non-career project to the Projects slot.
update projects set category = 'other' where category = 'home';
