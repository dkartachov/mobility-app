import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { deleteAllSessions } from '@/db/sessions';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const confirmDeleteSessions = () => {
    Alert.alert('Delete all sessions?', 'This wipes your workout history, streaks and goal progress.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAllSessions(db);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
      <ThemedText type="smallBold" themeColor="textSecondary" accessibilityRole="header">
        DATA
      </ThemedText>
      <Card style={styles.card}>
        <ThemedText themeColor="textSecondary">
          Remove every logged session, including test data. Your profile and goals are kept.
        </ThemedText>
        <Button title="Delete all sessions" variant="destructive" onPress={confirmDeleteSessions} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three,
  },
});
