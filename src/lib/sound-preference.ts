/**
 * Whether to play the sounds that are there for delight: finishing a day, reaching a milestone.
 * The cues you rely on with the phone out of sight, in workouts and measurements, always play.
 * This is about this phone rather than your data, so it lives in the key-value store and isn't
 * part of backups.
 */
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'soundEffectsEnabled';

// On unless turned off.
let current = Storage.getItemSync(STORAGE_KEY) !== 'false';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSoundEffectsEnabled() {
  return current;
}

export function setSoundEffectsEnabled(enabled: boolean) {
  Storage.setItemSync(STORAGE_KEY, String(enabled));
  current = enabled;
  listeners.forEach((listener) => listener());
}

export function useSoundEffectsEnabled() {
  return useSyncExternalStore(subscribe, getSoundEffectsEnabled);
}
