/**
 * The welcome screen owed after signing in, which the root layout shows before opening the app.
 * Saved rather than held in memory because restoring a backup restarts the app on the way there.
 */
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

export type Greeting = 'new' | 'returning';

const GREETING_KEY = 'login.greeting';

let greeting = Storage.getItemSync(GREETING_KEY) as Greeting | null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGreeting() {
  return greeting;
}

export function useGreeting() {
  return useSyncExternalStore(subscribe, getGreeting);
}

export function setGreeting(next: Greeting) {
  Storage.setItemSync(GREETING_KEY, next);
  greeting = next;
  listeners.forEach((listener) => listener());
}

export function clearGreeting() {
  Storage.removeItemSync(GREETING_KEY);
  greeting = null;
  listeners.forEach((listener) => listener());
}
