/**
 * Whether to remind you when a flexibility test is due. This is about this phone rather than your
 * data, so it lives in the key-value store and isn't part of backups.
 */
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'testRemindersEnabled';

// On unless turned off.
let current = Storage.getItemSync(STORAGE_KEY) !== 'false';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTestRemindersEnabled() {
  return current;
}

export function setTestRemindersEnabled(enabled: boolean) {
  Storage.setItemSync(STORAGE_KEY, String(enabled));
  current = enabled;
  listeners.forEach((listener) => listener());
}

export function useTestRemindersEnabled() {
  return useSyncExternalStore(subscribe, getTestRemindersEnabled);
}
