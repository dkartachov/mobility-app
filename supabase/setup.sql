-- One-time setup for cloud backups (see "Cloud backups" in the README). Paste into the Supabase SQL
-- editor.

insert into storage.buckets (id, name, public)
values
  ('backups-dev', 'backups-dev', false),
  ('backups-prod', 'backups-prod', false);

-- In each bucket, a user gets full access to the folder named after their user ID, and nothing else.
create policy "users own their folder in backups-dev" on storage.objects
  for all to authenticated
  using (bucket_id = 'backups-dev' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'))
  with check (bucket_id = 'backups-dev' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));

create policy "users own their folder in backups-prod" on storage.objects
  for all to authenticated
  using (bucket_id = 'backups-prod' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'))
  with check (bucket_id = 'backups-prod' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
