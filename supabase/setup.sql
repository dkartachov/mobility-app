-- One-time setup for cloud backups (see "Cloud backups" in the README). Paste into the Supabase SQL
-- editor.

-- Backups are one SQLite file (or a photo) each, so cap the size and type to limit what a stranger
-- could fill the bucket with. Raise the limit if a database ever outgrows it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('backups-dev', 'backups-dev', false, 52428800, array['application/octet-stream']),
  ('backups-prod', 'backups-prod', false, 52428800, array['application/octet-stream']);

-- In each bucket, a user gets full access to the folder named after their user ID, and nothing else.
create policy "users own their folder in backups-dev" on storage.objects
  for all to authenticated
  using (bucket_id = 'backups-dev' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'))
  with check (bucket_id = 'backups-dev' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));

create policy "users own their folder in backups-prod" on storage.objects
  for all to authenticated
  using (bucket_id = 'backups-prod' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'))
  with check (bucket_id = 'backups-prod' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
