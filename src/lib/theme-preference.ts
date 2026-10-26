import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { Appearance, useColorScheme as useSystemColorScheme } from 'react-native';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

const STORAGE_KEY = 'themePreference';

function readStoredPreference(): ThemePreference {
  const value = Storage.getItemSync(STORAGE_KEY);
  return THEME_PREFERENCES.find((p) => p === value) ?? 'system';
}

let current = readStoredPreference();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getThemePreference(): ThemePreference {
  return current;
}

/**
 * Overrides native UI (alerts, pickers, system bars) to match. Screens don't rely on this:
 * the native change event arrives late on Android, so they read the preference directly.
 */
function applyThemePreference(preference: ThemePreference) {
  Appearance.setColorScheme(preference === 'system' ? 'auto' : preference);
}

export function setThemePreference(preference: ThemePreference) {
  Storage.setItemSync(STORAGE_KEY, preference);
  current = preference;
  applyThemePreference(preference);
  listeners.forEach((listener) => listener());
}

/** Call once at startup, before the first render, so the app doesn't flash the wrong theme. */
export function applySavedThemePreference() {
  applyThemePreference(current);
}

export function useThemePreference() {
  return useSyncExternalStore(subscribe, getThemePreference);
}

/** The scheme the app should render in: the user's choice, or the system's when set to System. */
export function useColorScheme(): 'light' | 'dark' {
  const preference = useThemePreference();
  const system = useSystemColorScheme();
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}
