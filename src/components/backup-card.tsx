import { reloadAppAsync } from 'expo';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { showDialog } from '@/components/dialog';
import { Field, TextField } from '@/components/field';
import { IconBadge } from '@/components/icon-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  backUp,
  isBackupConfigured,
  linkDevice,
  listSnapshots,
  restoreSnapshot,
  unlinkDevice,
  useBackupState,
} from '@/lib/backup';
import { formatDateKey, type DateKey } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function restoreAndReload(db: SQLiteDatabase, date: DateKey) {
  try {
    await restoreSnapshot(db, date);
    await reloadAppAsync('Restored a backup');
  } catch (error) {
    showDialog({ title: "Couldn't restore this backup", message: errorMessage(error) });
  }
}

/** The Settings card for cloud backups: turn on, see the last backup, back up or restore the latest one. */
export function BackupCard() {
  const [signedIn, setSignedIn] = useState<boolean>();

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(session !== null));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <Card style={styles.card}>
      <View style={styles.rowTitle}>
        <IconBadge name={{ ios: 'icloud.fill', android: 'cloud' }} size={32} />
        <ThemedText type="smallBold">Cloud backup</ThemedText>
      </View>
      {!isBackupConfigured ? (
        <ThemedText themeColor="textSecondary">Backups aren&apos;t set up in this build.</ThemedText>
      ) : signedIn === false ? (
        <SignIn />
      ) : signedIn ? (
        <SignedIn />
      ) : null}
    </Card>
  );
}

/**
 * Email and a one-time code, no password. A new email gets a new user and an existing one signs
 * back in, so the same email on a new phone reaches the same backups.
 */
function SignIn() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const run = async (action: () => Promise<{ error: { message: string } | null }>) => {
    setLoading(true);
    setError(undefined);
    const result = await action();
    setLoading(false);
    if (result.error) setError(result.error.message);
    return !result.error;
  };

  const sendCode = async (address: string) => {
    if (await run(() => supabase!.auth.signInWithOtp({ email: address }))) {
      setSentTo(address);
      setCode('');
    }
  };

  const verify = () => run(() => supabase!.auth.verifyOtp({ email: sentTo!, token: code.trim(), type: 'email' }));

  if (sentTo === undefined) {
    return (
      <>
        <ThemedText themeColor="textSecondary">
          Keep a copy of your data in the cloud. Use the same email on a new phone to get it back.
        </ThemedText>
        <Field label="Email">
          <TextField
            accessibilityLabel="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
        </Field>
        {error && <ThemedText themeColor="danger">{error}</ThemedText>}
        <Button
          title="Turn on backups"
          onPress={() => sendCode(email.trim())}
          loading={loading}
          disabled={!email.trim()}
        />
      </>
    );
  }

  return (
    <>
      <ThemedText themeColor="textSecondary">Enter the code we sent to {sentTo}.</ThemedText>
      <Field label="Code">
        <TextField
          accessibilityLabel="Code"
          value={code}
          onChangeText={setCode}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          keyboardType="number-pad"
        />
      </Field>
      {error && <ThemedText themeColor="danger">{error}</ThemedText>}
      <Button title="Confirm" onPress={verify} loading={loading} disabled={!code.trim()} />
      <Button title="Send a new code" variant="secondary" onPress={() => sendCode(sentTo)} disabled={loading} />
      <Button title="Use a different email" variant="secondary" onPress={() => setSentTo(undefined)} disabled={loading} />
    </>
  );
}

const KEEP_WARNING = "This phone's data replaces the backup in the cloud, which can't be undone.";

function SignedIn() {
  const db = useSQLiteContext();
  const { linked, lastBackupAt, lastError, running } = useBackupState();
  /** The newest backup's date, `null` when there is none. Only looked up before linking. */
  const [latest, setLatest] = useState<DateKey | null>();
  const [listError, setListError] = useState<string>();
  const [listAttempt, setListAttempt] = useState(0);

  // A device that isn't linked yet needs to know straight away whether there's a backup to protect.
  useEffect(() => {
    if (linked) return;
    let cancelled = false;
    listSnapshots().then(
      (dates) => {
        if (cancelled) return;
        setLatest(dates[0] ?? null);
        setListError(undefined);
      },
      (error) => {
        if (!cancelled) setListError(errorMessage(error));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [linked, listAttempt]);

  // Nothing to overwrite, so there's no decision to ask for.
  useEffect(() => {
    if (!linked && latest === null) linkDevice(db);
  }, [linked, latest, db]);

  // Dismissing leaves the same two choices on the card, with backups paused until one is picked.
  useEffect(() => {
    if (linked || !latest) return;
    showDialog({
      title: 'Restore your backup?',
      message: `There's a backup from ${formatDateKey(latest)}. Restoring replaces everything on this phone with it, then restarts the app. ${KEEP_WARNING}`,
      actions: [
        { label: 'Restore', variant: 'primary', onPress: () => restoreAndReload(db, latest) },
        { label: "Keep this phone's data", variant: 'secondary', onPress: () => linkDevice(db) },
      ],
    });
  }, [linked, latest, db]);

  const confirmRestore = async () => {
    let date: DateKey | undefined;
    try {
      date = latest ?? (await listSnapshots())[0];
    } catch (error) {
      showDialog({ title: "Couldn't check for a backup", message: errorMessage(error) });
      return;
    }
    if (!date) {
      showDialog({ title: 'No backup yet', message: 'There is nothing in the cloud to restore.' });
      return;
    }
    const day = date;
    showDialog({
      title: `Restore the backup from ${formatDateKey(day)}?`,
      message: 'This replaces everything on this phone with it, then restarts the app.',
      confirm: { label: 'Restore', onPress: () => restoreAndReload(db, day) },
    });
  };

  const confirmKeep = () => {
    showDialog({
      title: "Keep this phone's data?",
      message: `${KEEP_WARNING} Backups start right away.`,
      confirm: { label: 'Keep', onPress: () => linkDevice(db) },
    });
  };

  const signOut = async () => {
    await supabase!.auth.signOut({ scope: 'local' });
    unlinkDevice();
  };

  if (!linked) {
    return (
      <>
        {listError ? (
          <>
            <ThemedText themeColor="danger">Couldn&apos;t check for a backup: {listError}</ThemedText>
            <Button title="Try again" variant="secondary" onPress={() => setListAttempt((attempt) => attempt + 1)} />
          </>
        ) : !latest ? (
          <ThemedText themeColor="textSecondary">Checking for a backup…</ThemedText>
        ) : (
          <>
            <ThemedText themeColor="textSecondary">
              There&apos;s a backup from {formatDateKey(latest)}. Restore it, or keep what&apos;s on this phone. Backups
              stay paused until you choose.
            </ThemedText>
            <Button title="Restore backup" onPress={confirmRestore} disabled={running} />
            <Button title="Keep this phone's data" variant="secondary" onPress={confirmKeep} disabled={running} />
          </>
        )}
        <Button title="Sign out" variant="secondary" onPress={signOut} />
      </>
    );
  }

  return (
    <>
      <ThemedText themeColor="textSecondary">
        {lastBackupAt ? `Last backup: ${new Date(lastBackupAt).toLocaleString()}` : 'No backups yet.'}
      </ThemedText>
      {lastError && <ThemedText themeColor="danger">Last backup failed: {lastError}</ThemedText>}
      <Button title="Back up now" onPress={() => backUp(db)} loading={running} />
      <Button title="Restore backup" variant="secondary" onPress={confirmRestore} disabled={running} />
      <Button title="Sign out" variant="secondary" onPress={signOut} disabled={running} />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
  },
});
