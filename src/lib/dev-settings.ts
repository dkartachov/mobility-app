/**
 * Development-only switches, toggled from the Developer section in Settings. They always read
 * as off in production builds, even if a value was stored.
 */
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

function devSwitch(key: string) {
  let enabled = __DEV__ && Storage.getItemSync(key) === 'true';
  const listeners = new Set<() => void>();

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const get = () => enabled;
  const set = (next: boolean) => {
    if (!__DEV__) return;
    Storage.setItemSync(key, String(next));
    enabled = next;
    listeners.forEach((listener) => listener());
  };
  const use = () => useSyncExternalStore(subscribe, get);

  return { get, set, use };
}

/** Short buffers and holds in workouts, see `FAST_BUFFER_SECONDS` and `FAST_STEP_SECONDS`. */
const fastWorkouts = devSwitch('dev.fastWorkouts');
export const getFastWorkouts = fastWorkouts.get;
export const setFastWorkouts = fastWorkouts.set;
export const useFastWorkouts = fastWorkouts.use;

/** Next works in flexibility tests without a measurement; skipped measurements save as 0. */
const skipTestMeasurements = devSwitch('dev.skipTestMeasurements');
export const setSkipTestMeasurements = skipTestMeasurements.set;
export const useSkipTestMeasurements = skipTestMeasurements.use;
