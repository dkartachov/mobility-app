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

-- Invite codes. Friends trade a code for a session through the `redeem-invite` Edge Function, so
-- nobody needs an account. Only codes' hashes are stored, and with row level security on and no
-- policies, only the function (using the service role) can read or change this table.
create table public.invites (
  code_hash text primary key,
  label text not null,
  -- Filled in on first use, or set it to link a code to an existing user.
  email text,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;

-- To invite someone, run this with their name. It returns their code, which is not stored anywhere
-- else, so copy it now. Each code is its own user: reinstalling with the same code gets the same
-- backups back.
--
--   with new as (select upper(encode(extensions.gen_random_bytes(10), 'hex')) as code),
--   added as (
--     insert into public.invites (code_hash, label)
--     select encode(extensions.digest(code, 'sha256'), 'hex'), 'Alice' from new
--   )
--   select regexp_replace(code, '(.{4})(?=.)', '\1-', 'g') as invite_code from new;
--
-- To revoke someone: set `revoked = true` on their row, then ban or delete their user under
-- Authentication, since a session they already have keeps working until then.
