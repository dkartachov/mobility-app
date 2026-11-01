import { reloadAppAsync } from 'expo';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { showDialog } from '@/components/dialog';
import { IconBadge } from '@/components/icon-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuthState } from '@/lib/auth';
import { backUp, isBackupConfigured, listSnapshots, restoreSnapshot, useBackupState } from '@/lib/backup';
import { formatDateKey, type DateKey } from '@/lib/dates';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The Settings card for cloud backups, which are always on once signed in (see the login screen):
 * the last backup, backing up now, and restoring the latest backup.
 */
export function BackupCard() {
  return (
    <Card style={styles.card}>
      <View style={styles.rowTitle}>
        <IconBadge name={{ ios: 'icloud.fill', android: 'cloud' }} size={32} />
        <ThemedText type="smallBold">Cloud backup</ThemedText>
      </View>
      {isBackupConfigured ? (
        <BackupStatus />
      ) : (
        <ThemedText themeColor="textSecondary">Backups aren&apos;t set up in this build.</ThemedText>
      )}
    </Card>
  );
}

function BackupStatus() {
  const db = useSQLiteContext();
  const { email } = useAuthState();
  const { lastBackupAt, lastError, running } = useBackupState();

  const restore = async (date: DateKey) => {
    try {
      await restoreSnapshot(db, date);
      await reloadAppAsync('Restored a backup');
    } catch (error) {
      showDialog({ title: "Couldn't restore this backup", message: errorMessage(error) });
    }
  };

  const confirmRestore = async () => {
    let date: DateKey | undefined;
    try {
      date = (await listSnapshots())[0];
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
      confirm: { label: 'Restore', onPress: () => restore(day) },
    });
  };

  return (
    <>
      <ThemedText themeColor="textSecondary">
        {lastBackupAt ? `Last backup: ${new Date(lastBackupAt).toLocaleString()}` : 'No backups yet.'}
        {email ? ` Backing up to ${email}.` : ''}
      </ThemedText>
      {lastError && <ThemedText themeColor="danger">Last backup failed: {lastError}</ThemedText>}
      <Button title="Back up now" onPress={() => backUp(db)} loading={running} />
      <Button title="Restore backup" variant="secondary" onPress={confirmRestore} disabled={running} />
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
