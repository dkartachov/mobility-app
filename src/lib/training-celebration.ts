/**
 * Remembers the last day whose first session was celebrated on the Dashboard, so the celebration
 * plays once per day rather than every time the tab is opened. This is about this phone rather than
 * your data, so it lives in the key-value store and isn't part of backups.
 */
import Storage from 'expo-sqlite/kv-store';

import type { DateKey } from './dates';

const STORAGE_KEY = 'celebratedTrainingDay';

export function wasCelebrated(date: DateKey) {
  return Storage.getItemSync(STORAGE_KEY) === date;
}

export function markCelebrated(date: DateKey) {
  Storage.setItemSync(STORAGE_KEY, date);
}

/** Lets today's celebration play again, e.g. after a dev session. */
export function resetCelebration() {
  Storage.removeItemSync(STORAGE_KEY);
}
