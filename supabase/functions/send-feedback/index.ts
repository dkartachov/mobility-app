// Emails feedback, and reports about exercises and flexibility tests, from the app to the developer's Gmail inbox.
// Deploy with `supabase functions deploy send-feedback` after setting its two secrets:
//   supabase secrets set GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD=<16-character app password>
// The SMTP settings under Authentication in the dashboard only send Auth emails (the sign-in
// codes), so this function connects to Gmail itself. SUPABASE_URL and SUPABASE_ANON_KEY are
// provided by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import nodemailer from 'npm:nodemailer@6.10.1';

/** Matches `EXERCISE_REASONS` and `TEST_REASONS` in `src/lib/feedback.ts`. */
const REASONS: Record<string, string> = {
  pain: 'Caused pain',
  unclear: 'Instructions unclear',
  video: "Video doesn't match",
  too_hard: 'Too hard',
  too_easy: 'Too easy',
  measurement: 'Measurement seems wrong',
  phone: "Phone measuring didn't work",
  position: "Can't get into position",
  other: 'Other',
};

const SUBJECT_LABELS = { exercise: 'Exercise', test: 'Test' } as const;
const MAX_MESSAGE = 2000;
const MAX_FIELD = 100;

function respond(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** A short single-line value from the request, so nothing typed can break the subject line. */
function field(value: unknown) {
  return typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_FIELD) : '';
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return respond({ error: 'Use POST' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization) return respond({ error: 'Sign in first' }, 401);

  // Only signed-in users can send, so strangers with the app's publishable key can't fill the
  // inbox, and every email has an address to reply to.
  const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await caller.auth.getUser();
  if (error || !data.user) return respond({ error: 'Sign in first' }, 401);
  const user = data.user;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return respond({ error: 'Send JSON' }, 400);
  }
  const kind = body.kind === 'exercise' ? 'exercise' : body.kind === 'test' ? 'test' : 'general';
  const reason = typeof body.reason === 'string' && Object.hasOwn(REASONS, body.reason) ? body.reason : null;
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE) : '';
  if (kind === 'general' && !message) return respond({ error: 'Write a message' }, 400);

  const details: string[] = [];
  let subject = '[Plié] Feedback';
  if (kind !== 'general') {
    const id = field(kind === 'exercise' ? body.exerciseId : body.testId);
    const name = field(kind === 'exercise' ? body.exerciseName : body.testName) || id;
    if (!id || !reason) return respond({ error: 'Pick a reason' }, 400);
    const side = kind === 'test' ? field(body.side) : '';
    const reading = kind === 'test' ? field(body.reading) : '';
    const label = SUBJECT_LABELS[kind];
    subject = `[Plié] ${label} report: ${name}${side ? ` (${side})` : ''} — ${REASONS[reason]}`;
    details.push(`${label}: ${name} (${id})`, `Reason: ${REASONS[reason]}`);
    if (side) details.push(`Side: ${side}`);
    if (reading) details.push(`Reading on screen: ${reading}`);
  }
  details.push(
    `From: ${user.email ?? 'no email'} (${user.id})`,
    `App: ${field(body.appVersion) || 'unknown'} (${field(body.variant) || 'unknown'}) on ${field(body.platform) || 'unknown'}`
  );

  const gmail = Deno.env.get('GMAIL_USER');
  const password = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!gmail || !password) {
    console.error('send-feedback: GMAIL_USER or GMAIL_APP_PASSWORD is not set');
    return respond({ error: "Feedback isn't set up yet" }, 500);
  }

  try {
    const transport = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      // Edge Functions can't connect out on ports 25 or 587, so this uses SMTP over TLS on 465.
      port: 465,
      secure: true,
      auth: { user: gmail, pass: password },
    });
    await transport.sendMail({
      from: `Plié feedback <${gmail}>`,
      to: gmail,
      // Replying in Gmail answers the user directly.
      replyTo: user.email ?? undefined,
      subject,
      // Plain text only, so nothing the user typed is ever rendered as HTML.
      text: `${message || '(no message)'}\n\n---\n${details.join('\n')}\n`,
    });
  } catch (failure) {
    console.error('send-feedback failed', failure);
    return respond({ error: "Couldn't send. Try again." }, 500);
  }
  return respond({ sent: true }, 200);
});
