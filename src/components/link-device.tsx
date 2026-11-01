import { reloadAppAsync } from 'expo';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/button';
import { showDialog } from '@/components/dialog';
import { ThemedText } from '@/components/themed-text';
import { hasUnsavedChanges, linkDevice, listSnapshots, restoreSnapshot } from '@/lib/backup';
import { formatDateKey, type DateKey } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

const KEEP_WARNING = "This phone's data replaces the backup in the cloud, which can't be undone.";

/**
 * Right after signing in: restores the latest backup or starts backing up, which opens the app.
 * Only a phone with changes of its own, from before this sign-in, has to choose between the two.
 */
export function LinkDevice() {
  const db = useSQLiteContext();
  /** The newest backup's date, `null` when there is none. */
  const [latest, setLatest] = useState<DateKey | null>();
  const [listError, setListError] = useState<string>();
  const [restoreError, setRestoreError] = useState<string>();
  const [restoring, setRestoring] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Read once: backing up or restoring changes it, and the choice mustn't change under the user.
  const [mustChoose] = useState(hasUnsavedChanges);
  const autoRestored = useRef(false);

  useEffect(() => {
    let cancelled = false;
    listSnapshots().then(
      (dates) => {
        if (!cancelled) setLatest(dates[0] ?? null);
      },
      (error) => {
        if (!cancelled) setListError(errorMessage(error));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const restore = async (date: DateKey) => {
    setRestoring(true);
    setRestoreError(undefined);
    try {
      await restoreSnapshot(db, date);
      await reloadAppAsync('Restored a backup');
    } catch (error) {
      setRestoreError(errorMessage(error));
      setRestoring(false);
    }
  };

  // Nothing to lose on either side, so there's nothing to ask.
  useEffect(() => {
    if (latest === null) {
      linkDevice(db);
    } else if (latest && !mustChoose && !autoRestored.current) {
      autoRestored.current = true;
      restore(latest);
    }
    // `restore` only closes over `db`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest, mustChoose, db]);

  const confirmRestore = (date: DateKey) => {
    showDialog({
      title: 'Restore your backup?',
      message: 'This replaces everything on this phone with it, then restarts the app.',
      confirm: { label: 'Restore', onPress: () => restore(date) },
    });
  };

  const confirmKeep = () => {
    showDialog({
      title: "Keep this phone's data?",
      message: `${KEEP_WARNING} Backups start right away.`,
      confirm: { label: 'Keep', onPress: () => linkDevice(db) },
    });
  };

  const differentEmailButton = (
    <Button
      title="Use a different email"
      variant="secondary"
      onPress={() => supabase!.auth.signOut({ scope: 'local' })}
      disabled={restoring}
    />
  );

  if (listError) {
    return (
      <>
        <ThemedText themeColor="danger">Couldn&apos;t check for a backup: {listError}</ThemedText>
        <Button
          title="Try again"
          onPress={() => {
            setListError(undefined);
            setAttempt((count) => count + 1);
          }}
        />
        {differentEmailButton}
      </>
    );
  }

  if (latest === undefined || latest === null) {
    return <ThemedText themeColor="textSecondary">Checking for a backup…</ThemedText>;
  }

  if (restoring) {
    return <ThemedText themeColor="textSecondary">Restoring your backup…</ThemedText>;
  }

  if (restoreError) {
    return (
      <>
        <ThemedText themeColor="danger">Couldn&apos;t restore your backup: {restoreError}</ThemedText>
        <Button title="Try again" onPress={() => restore(latest)} />
        <Button title="Start without it" variant="secondary" onPress={confirmKeep} />
        {differentEmailButton}
      </>
    );
  }

  if (!mustChoose) {
    return <ThemedText themeColor="textSecondary">Restoring your backup…</ThemedText>;
  }

  return (
    <>
      <ThemedText themeColor="textSecondary">
        There&apos;s a backup from {formatDateKey(latest)}, and this phone has data of its own. Restore the backup, or
        keep what&apos;s on this phone. {KEEP_WARNING}
      </ThemedText>
      <Button title="Restore backup" onPress={() => confirmRestore(latest)} />
      <Button title="Keep this phone's data" variant="secondary" onPress={confirmKeep} />
      {differentEmailButton}
    </>
  );
}
