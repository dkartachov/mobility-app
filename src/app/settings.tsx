import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackupCard } from '@/components/backup-card';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { DevTools } from '@/components/dev-tools';
import { showDialog } from '@/components/dialog';
import { IconBadge } from '@/components/icon-badge';
import { PageHeader } from '@/components/page-header';
import { ScrollView } from '@/components/scroll-view';
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
    showDialog({
      title: 'Delete all sessions?',
      message: 'This wipes your workout history.',
      confirm: {
        label: 'Delete',
        onPress: async () => {
          await deleteAllSessions(db);
          router.back();
        },
      },
    });
  };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <PageHeader title="Settings" />
        <View style={styles.section}>
          <ThemedText type="eyebrow" themeColor="textSecondary" accessibilityRole="header">
            Appearance
          </ThemedText>
          <Card style={styles.card}>
            <View style={styles.rowTitle}>
              <IconBadge name={{ ios: 'circle.lefthalf.filled', android: 'contrast' }} size={32} />
              <ThemedText type="smallBold">Theme</ThemedText>
            </View>
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
          <ThemedText type="eyebrow" themeColor="textSecondary" accessibilityRole="header">
            Data
          </ThemedText>
          <BackupCard />
          <Card style={styles.card}>
            <View style={styles.rowTitle}>
              <IconBadge
                name={{ ios: 'trash.fill', android: 'delete' }}
                color="danger"
                background="backgroundSelected"
                size={32}
              />
              <ThemedText type="smallBold">Workout history</ThemedText>
            </View>
            <ThemedText themeColor="textSecondary">
              Remove every logged session, including test data. Your profile is kept.
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
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
