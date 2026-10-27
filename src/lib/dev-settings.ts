/**
 * Development-only switches, toggled from the Developer section in Settings. They always read
 * as off in production builds, even if a value was stored.
 */
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

const FAST_WORKOUTS_KEY = 'dev.fastWorkouts';

let fastWorkouts = __DEV__ && Storage.getItemSync(FAST_WORKOUTS_KEY) === 'true';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Short buffers and holds in workouts, see `FAST_BUFFER_SECONDS` and `FAST_STEP_SECONDS`. */
export function getFastWorkouts() {
  return fastWorkouts;
}

export function setFastWorkouts(enabled: boolean) {
  if (!__DEV__) return;
  Storage.setItemSync(FAST_WORKOUTS_KEY, String(enabled));
  fastWorkouts = enabled;
  listeners.forEach((listener) => listener());
}

export function useFastWorkouts() {
  return useSyncExternalStore(subscribe, getFastWorkouts);
}
