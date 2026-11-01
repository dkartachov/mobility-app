/**
 * How long a timeout during a workout lasts. This is about this phone rather than your data, so it
 * lives in the key-value store and isn't part of backups.
 */
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

export const TIMEOUT_SECONDS_OPTIONS = [30, 60] as const;
export const DEFAULT_TIMEOUT_SECONDS = 30;

/** How much tapping the timer adds to a running timeout. */
export const TIMEOUT_EXTEND_SECONDS = 30;

const STORAGE_KEY = 'timeoutSeconds';

function readStoredSeconds() {
  const value = Number(Storage.getItemSync(STORAGE_KEY));
  return TIMEOUT_SECONDS_OPTIONS.find((seconds) => seconds === value) ?? DEFAULT_TIMEOUT_SECONDS;
}

let current: number = readStoredSeconds();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTimeoutSeconds() {
  return current;
}

export function setTimeoutSeconds(seconds: number) {
  Storage.setItemSync(STORAGE_KEY, String(seconds));
  current = seconds;
  listeners.forEach((listener) => listener());
}

export function useTimeoutSeconds() {
  return useSyncExternalStore(subscribe, getTimeoutSeconds);
}

/** `45 s`, or `2 min` for whole minutes. */
export function formatTimeoutLength(seconds: number) {
  return seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`;
}
