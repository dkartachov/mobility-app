/**
 * Development-only switches, toggled from the Developer section in Settings. They always read
 * as off unless dev tools are enabled, even if a value was stored.
 */
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

/**
 * Whether the Developer section and its switches are available: when running from Metro, or in
 * bundles exported with `EXPO_PUBLIC_DEV_TOOLS=true`, such as development-channel EAS updates.
 */
export const DEV_TOOLS_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === 'true';

function devSwitch(key: string) {
  let enabled = DEV_TOOLS_ENABLED && Storage.getItemSync(key) === 'true';
  const listeners = new Set<() => void>();

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const get = () => enabled;
  const set = (next: boolean) => {
    if (!DEV_TOOLS_ENABLED) return;
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
