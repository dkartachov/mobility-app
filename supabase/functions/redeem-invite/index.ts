// Edge Function (Deno): trades an invite code for a session, so friends can back up without
// creating an account. Deploy with `--no-verify-jwt`, since the caller has no session yet.
//
// Each code maps to exactly one user. The first redemption creates that user, and later ones (a
// reinstall, a new phone) get the same user back, so the backups in their folder are still theirs.
// Codes are stored hashed in `public.invites`, which only this function can reach. See
// `supabase/setup.sql` for how to make and revoke them.
import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** The same code is accepted with or without dashes, spaces and capitals. */
function normalizeCode(code: unknown) {
  return typeof code === 'string' ? code.replace(/[\s-]/g, '').toUpperCase() : '';
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);

  const code = normalizeCode((await request.json().catch(() => null))?.code);
  // Real codes are 80 bits, so guessing one isn't feasible. This only rejects junk early.
  if (code.length < 16) return respond({ error: 'Invalid invite code' }, 401);

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const codeHash = await sha256Hex(code);

  const { data: invite, error: lookupError } = await admin
    .from('invites')
    .select('email, revoked')
    .eq('code_hash', codeHash)
    .maybeSingle();
  if (lookupError) return respond({ error: 'Something went wrong' }, 500);
  // Unknown and revoked look the same, so a code can't be probed.
  if (!invite || invite.revoked) return respond({ error: 'Invalid invite code' }, 401);

  // An invite made for an existing user keeps its email. Otherwise the first use creates a user
  // with a throwaway address that is never emailed.
  let email: string = invite.email ?? `invite-${codeHash.slice(0, 16)}@invites.example.com`;
  if (!invite.email) {
    // Creating can fail only because a concurrent first use got there first, which is fine.
    await admin.auth.admin.createUser({ email, email_confirm: true });
    const { error } = await admin.from('invites').update({ email }).eq('code_hash', codeHash);
    if (error) return respond({ error: 'Something went wrong' }, 500);
  }

  // A one-time login token for that user, redeemed straight away for a normal session.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkError || !link.properties?.hashed_token) return respond({ error: 'Something went wrong' }, 500);

  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
  if (error || !data.session) return respond({ error: 'Something went wrong' }, 500);

  return respond({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});
