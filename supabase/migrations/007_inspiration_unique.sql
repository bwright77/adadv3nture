alter table inspiration_photos
  add constraint inspiration_photos_user_filename_key
  unique (user_id, original_filename);
