import { addDatabaseChangeListener, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { backUpIfDirty, isBackupConfigured, markBackupDirty, retryBackupIfDirty } from '@/lib/backup';

/** Long enough that one action's writes (a test saves many rows) become one upload. */
const CHANGE_DELAY_MS = 5000;

/**
 * Backs up shortly after the database changes, and tries again whenever the app opens or goes to
 * the background, which is how a failed upload gets retried. Renders nothing; it's a component
 * because it has to sit inside `SQLiteProvider`.
 */
export function AutoBackup() {
  const db = useSQLiteContext();

  useEffect(() => {
    if (!isBackupConfigured) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    retryBackupIfDirty(db);
    const changes = addDatabaseChangeListener(() => {
      markBackupDirty();
      clearTimeout(timer);
      timer = setTimeout(() => backUpIfDirty(db), CHANGE_DELAY_MS);
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active' || next === 'background') {
        clearTimeout(timer);
        retryBackupIfDirty(db);
      }
    });

    return () => {
      clearTimeout(timer);
      changes.remove();
      appState.remove();
    };
  }, [db]);

  return null;
}
