-- Storage bucket for inspiration photos (public — personal adventure photos, not sensitive)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspiration-photos',
  'inspiration-photos',
  true,
  10485760,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Storage policies (drop first to avoid duplicate errors)
drop policy if exists "inspiration storage: read" on storage.objects;
drop policy if exists "inspiration storage: insert" on storage.objects;
drop policy if exists "inspiration storage: delete" on storage.objects;

create policy "inspiration storage: read" on storage.objects
  for select using (bucket_id = 'inspiration-photos');

create policy "inspiration storage: insert" on storage.objects
  for insert with check (bucket_id = 'inspiration-photos' and auth.role() = 'authenticated');

create policy "inspiration storage: delete" on storage.objects
  for delete using (bucket_id = 'inspiration-photos' and auth.role() = 'authenticated');
