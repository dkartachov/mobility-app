import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { DevTools } from '@/components/dev-tools';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deleteAllSessions } from '@/db/sessions';
import {
  THEME_PREFERENCES,
  THEME_PREFERENCE_LABELS,
  setThemePreference,
  useThemePreference,
} from '@/lib/theme-preference';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const themePreference = useThemePreference();

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
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <ThemedText type="title" accessibilityRole="header">
          Settings
        </ThemedText>
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" accessibilityRole="header">
            APPEARANCE
          </ThemedText>
          <Card style={styles.card}>
            <ThemedText>Theme</ThemedText>
            <View style={styles.row} accessibilityRole="radiogroup">
              {THEME_PREFERENCES.map((preference) => (
                <Chip
                  key={preference}
                  label={THEME_PREFERENCE_LABELS[preference]}
                  selected={themePreference === preference}
                  onPress={() => setThemePreference(preference)}
                />
              ))}
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" accessibilityRole="header">
            DATA
          </ThemedText>
          <Card style={styles.card}>
            <ThemedText themeColor="textSecondary">
              Remove every logged session, including test data. Your profile and goals are kept.
            </ThemedText>
            <Button title="Delete all sessions" variant="destructive" onPress={confirmDeleteSessions} />
          </Card>
        </View>

        {__DEV__ && <DevTools />}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
