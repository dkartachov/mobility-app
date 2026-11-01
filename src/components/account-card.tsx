import { reloadAppAsync } from 'expo';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { showDialog } from '@/components/dialog';
import { IconBadge } from '@/components/icon-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuthState } from '@/lib/auth';
import { signOutAndErase } from '@/lib/backup';

/** The Settings card for the signed-in account. Render it only in builds with backups. */
export function AccountCard() {
  const db = useSQLiteContext();
  const { email } = useAuthState();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await signOutAndErase(db);
      await reloadAppAsync('Signed out');
    } catch (error) {
      setSigningOut(false);
      showDialog({
        title: "Couldn't sign out",
        message: `You're still signed in and nothing was removed. ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const confirmSignOut = () => {
    showDialog({
      title: 'Sign out?',
      message: 'Your data is backed up, then removed from this phone. Signing in again brings it back.',
      confirm: { label: 'Sign out', onPress: signOut },
    });
  };

  return (
    <Card style={styles.card}>
      <View style={styles.rowTitle}>
        <IconBadge name={{ ios: 'person.fill', android: 'person' }} size={32} />
        <ThemedText type="smallBold">Account</ThemedText>
      </View>
      {email && <ThemedText themeColor="textSecondary">Signed in as {email}.</ThemedText>}
      <Button title="Sign out" variant="destructive" onPress={confirmSignOut} loading={signingOut} />
    </Card>
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
