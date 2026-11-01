import { useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountCard } from '@/components/account-card';
import { BackupCard } from '@/components/backup-card';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { DevTools } from '@/components/dev-tools';
import { showDialog } from '@/components/dialog';
import { IconBadge } from '@/components/icon-badge';
import { PageHeader } from '@/components/page-header';
import { RemindersCard } from '@/components/reminders-card';
import { ScrollView } from '@/components/scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { isBackupConfigured } from '@/lib/backup';
import { resetInstructions } from '@/lib/instructions';
import {
  THEME_PREFERENCES,
  THEME_PREFERENCE_LABELS,
  setThemePreference,
  useThemePreference,
} from '@/lib/theme-preference';
import {
  TIMEOUT_SECONDS_OPTIONS,
  formatTimeoutLength,
  setTimeoutSeconds,
  useTimeoutSeconds,
} from '@/lib/timeout-preference';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const themePreference = useThemePreference();
  const timeoutSeconds = useTimeoutSeconds();
  const { section } = useLocalSearchParams<{ section?: 'reminders' }>();
  const scrollView = useRef<ScrollViewInstance>(null);
  const scrolledToSection = useRef(false);

  // Only the first layout: the section lays out again as its reminders change, and must not jump.
  const scrollToReminders = ({ nativeEvent }: LayoutChangeEvent) => {
    if (section !== 'reminders' || scrolledToSection.current) return;
    scrolledToSection.current = true;
    scrollView.current?.scrollTo({ y: nativeEvent.layout.y - Spacing.three });
  };

  const showInstructionsAgain = () => {
    resetInstructions();
    showDialog({ title: 'Instructions reset', message: "They'll show again the next time they come up." });
  };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        ref={scrollView}
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
            Workouts
          </ThemedText>
          <Card style={styles.card}>
            <View style={styles.rowTitle}>
              <IconBadge name={{ ios: 'timer', android: 'timer' }} size={32} />
              <ThemedText type="smallBold">Timeout length</ThemedText>
            </View>
            <View style={styles.row} accessibilityRole="radiogroup">
              {TIMEOUT_SECONDS_OPTIONS.map((seconds) => (
                <Chip
                  key={seconds}
                  label={formatTimeoutLength(seconds)}
                  selected={timeoutSeconds === seconds}
                  onPress={() => setTimeoutSeconds(seconds)}
                />
              ))}
            </View>
          </Card>
        </View>

        <View style={styles.section} onLayout={scrollToReminders}>
          <ThemedText type="eyebrow" themeColor="textSecondary" accessibilityRole="header">
            Reminders
          </ThemedText>
          <RemindersCard />
        </View>

        <View style={styles.section}>
          <ThemedText type="eyebrow" themeColor="textSecondary" accessibilityRole="header">
            Instructions
          </ThemedText>
          <Card style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              Some instructions only show the first time you need them.
            </ThemedText>
            <Button title="Show instructions again" variant="secondary" onPress={showInstructionsAgain} />
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="eyebrow" themeColor="textSecondary" accessibilityRole="header">
            Data
          </ThemedText>
          <BackupCard />
        </View>

        {isBackupConfigured && (
          <View style={styles.section}>
            <ThemedText type="eyebrow" themeColor="textSecondary" accessibilityRole="header">
              Account
            </ThemedText>
            <AccountCard />
          </View>
        )}

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
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
