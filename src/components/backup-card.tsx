import { reloadAppAsync } from 'expo';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
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

/** The Settings card for cloud backups: sign in, see the last backup, back up or restore. */
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

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    setError(undefined);
    const result = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) setError(result.error.message);
    setLoading(false);
  };

  return (
    <>
      <ThemedText themeColor="textSecondary">Sign in to keep a copy of your data in the cloud.</ThemedText>
      <Field label="Email">
        <TextField
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
      </Field>
      <Field label="Password">
        <TextField value={password} onChangeText={setPassword} autoComplete="current-password" secureTextEntry />
      </Field>
      {error && <ThemedText themeColor="danger">{error}</ThemedText>}
      <Button title="Sign in" onPress={signIn} loading={loading} disabled={!email.trim() || !password} />
    </>
  );
}

function SignedIn() {
  const db = useSQLiteContext();
  const { linked, lastBackupAt, lastError, running } = useBackupState();
  const [snapshots, setSnapshots] = useState<DateKey[]>();
  const [listError, setListError] = useState<string>();
  const [showRestore, setShowRestore] = useState(false);

  const [listAttempt, setListAttempt] = useState(0);

  // Linked devices list backups when asked to restore; new ones need the answer straight away.
  useEffect(() => {
    if (linked && !showRestore) return;
    let cancelled = false;
    listSnapshots().then(
      (dates) => {
        if (cancelled) return;
        setSnapshots(dates);
        setListError(undefined);
      },
      (error) => {
        if (!cancelled) setListError(errorMessage(error));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [linked, showRestore, listAttempt]);

  // Nothing to overwrite, so there's no decision to ask for.
  useEffect(() => {
    if (!linked && snapshots?.length === 0) linkDevice(db);
  }, [linked, snapshots, db]);

  // Declining leaves the card's choices below: older backups, or keeping this phone's data.
  useEffect(() => {
    const latest = snapshots?.[0];
    if (linked || !latest) return;
    showDialog({
      title: 'Restore your latest backup?',
      message: `This account has a backup from ${formatDateKey(latest)}. Restoring replaces everything on this phone with it, then restarts the app.`,
      cancelLabel: 'Not now',
      confirm: { label: 'Restore', onPress: () => restoreAndReload(db, latest) },
    });
  }, [linked, snapshots, db]);

  const confirmRestore = (date: DateKey) => {
    showDialog({
      title: `Restore ${formatDateKey(date)}?`,
      message: 'This replaces everything on this phone with that backup, then restarts the app.',
      confirm: { label: 'Restore', onPress: () => restoreAndReload(db, date) },
    });
  };

  const confirmKeep = () => {
    showDialog({
      title: "Keep this phone's data?",
      message:
        "This phone starts backing up, replacing today's backup if there is one. Backups from earlier days stay available for now.",
      confirm: { label: 'Keep', onPress: () => linkDevice(db) },
    });
  };

  const signOut = async () => {
    await supabase!.auth.signOut({ scope: 'local' });
    unlinkDevice();
  };

  const snapshotChips = (
    <View style={styles.chips}>
      {snapshots?.map((date) => (
        <Chip key={date} label={formatDateKey(date)} selected={false} onPress={() => confirmRestore(date)} />
      ))}
    </View>
  );

  if (!linked) {
    return (
      <>
        {listError ? (
          <>
            <ThemedText themeColor="danger">Couldn&apos;t check for backups: {listError}</ThemedText>
            <Button title="Try again" variant="secondary" onPress={() => setListAttempt((attempt) => attempt + 1)} />
          </>
        ) : snapshots === undefined || snapshots.length === 0 ? (
          <ThemedText themeColor="textSecondary">Checking for backups…</ThemedText>
        ) : (
          <>
            <ThemedText themeColor="textSecondary">
              This account already has backups. Pick one to restore, or keep what&apos;s on this phone. Backups stay
              paused until you choose.
            </ThemedText>
            {snapshotChips}
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
      {showRestore ? (
        <>
          {listError && <ThemedText themeColor="danger">Couldn&apos;t list backups: {listError}</ThemedText>}
          {snapshots?.length === 0 && <ThemedText themeColor="textSecondary">No backups to restore yet.</ThemedText>}
          {snapshotChips}
        </>
      ) : (
        <Button title="Restore a backup" variant="secondary" onPress={() => setShowRestore(true)} disabled={running} />
      )}
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
