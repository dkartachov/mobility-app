/**
 * Who is signed in, for the login gate in the root layout and the backup card. Supabase keeps the
 * session on the phone and renews it, so this only changes when signing in, or when Supabase ends
 * the session for good (a deleted user, say). Network errors don't sign anyone out.
 */
import { useSyncExternalStore } from 'react';

import { unlinkDevice } from '@/lib/backup';
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
  if (event === 'SIGNED_OUT') unlinkDevice();
  state = { signedIn: session !== null, email: session?.user.email ?? null };
  listeners.forEach((listener) => listener());
});
