/**
 * Who is signed in, for the login gate in the root layout and the backup card. Supabase keeps the
 * session on the phone and renews it, so this only changes when signing in, or when Supabase ends
 * the session for good (a deleted user, say). Network errors don't sign anyone out.
 */
import { useSyncExternalStore } from 'react';

import { unlinkDevice } from '@/lib/backup';
import { clearGreeting } from '@/lib/greeting';
import { supabase } from '@/lib/supabase';

export type AuthState = {
  /** `undefined` until Supabase has read the saved session. */
  signedIn: boolean | undefined;
  email: string | null;
};

let state: AuthState = { signedIn: undefined, email: null };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAuthState() {
  return state;
}

export function useAuthState() {
  return useSyncExternalStore(subscribe, getAuthState);
}

supabase?.auth.onAuthStateChange((event, session) => {
  // Whoever signs in next may be someone else, so this phone must ask again before uploading.
  if (event === 'SIGNED_OUT') {
    unlinkDevice();
    clearGreeting();
  }
  state = { signedIn: session !== null, email: session?.user.email ?? null };
  listeners.forEach((listener) => listener());
});

/**
 * Copies the name to the user's Supabase account, for the Display name column in the dashboard.
 * Nothing in the app reads it back, so failing (offline, say) only gets logged.
 */
export function syncDisplayName({ firstName, lastName }: { firstName: string; lastName: string }) {
  const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
  if (!supabase || !displayName) return;
  supabase.auth
    .updateUser({ data: { display_name: displayName } })
    .then(({ error }) => {
      if (error) console.warn(error.message);
    })
    .catch(console.warn);
}
