// Deletes the signed-in user's account and every backup file they have in the app's storage buckets.
// Deploy with `supabase functions deploy delete-account`. SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are provided to the function by Supabase, so there's nothing to set.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

/** Both app variants back up to the same project, so one account can have files in each. */
const BUCKETS = ['backups-prod', 'backups-dev'];
/** The folders `src/lib/backup.ts` writes under each user's ID. */
const FOLDERS = ['snapshots', 'photos'];
const PAGE_SIZE = 1000;

function respond(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return respond({ error: 'Use POST' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization) return respond({ error: 'Sign in first' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  // Asks Supabase who the caller is, using their own token, rather than trusting a user ID sent in
  // the request.
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await caller.auth.getUser();
  if (error || !data.user) return respond({ error: 'Sign in first' }, 401);
  const userId = data.user.id;

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    for (const bucket of BUCKETS) {
      const paths: string[] = [];
      for (const folder of FOLDERS) {
        const { data: files, error: listError } = await admin.storage
          .from(bucket)
          .list(`${userId}/${folder}`, { limit: PAGE_SIZE });
        if (listError) throw listError;
        paths.push(...(files ?? []).map((file) => `${userId}/${folder}/${file.name}`));
      }
      if (paths.length > 0) {
        const { error: removeError } = await admin.storage.from(bucket).remove(paths);
        if (removeError) throw removeError;
      }
    }
    // Last, so a failure before this leaves the account in place and the app can try again.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;
  } catch (failure) {
    console.error('delete-account failed', failure);
    return respond({ error: "Couldn't delete the account. Try again." }, 500);
  }
  return respond({ deleted: true }, 200);
});
