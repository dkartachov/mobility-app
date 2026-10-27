import { useSQLiteContext } from 'expo-sqlite';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { addDevSession, addDevStreak, jumpToNextMilestone, resetAllData } from '@/db/dev';
import { useStats } from '@/db/sessions';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/dates';
import { setFastWorkouts, useFastWorkouts } from '@/lib/dev-settings';
import { milestoneProgress } from '@/lib/milestones';
import { FAST_BUFFER_SECONDS, FAST_STEP_SECONDS } from '@/lib/workout';

import { Button } from './button';
import { Card } from './card';
import { ThemedText } from './themed-text';

/** Settings section for faking data during development. Render it behind `__DEV__` only. */
export function DevTools() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const stats = useStats();
  const fastWorkouts = useFastWorkouts();
  const nextHours = stats ? milestoneProgress(stats.totalSeconds).nextHours : null;

  const confirmReset = () => {
    Alert.alert('Reset all data?', 'Deletes sessions and goals and clears your profile.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => resetAllData(db) },
    ]);
  };

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" accessibilityRole="header">
        DEVELOPER
      </ThemedText>
      <Card style={styles.card}>
        <ThemedText themeColor="textSecondary">
          Total {formatDuration(stats?.totalSeconds ?? 0)} · next milestone{' '}
          {nextHours === null ? 'none' : `${nextHours}h`}
        </ThemedText>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <ThemedText>Fast workouts</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {FAST_BUFFER_SECONDS} s get-ready, {FAST_STEP_SECONDS} s per exercise or side. Still logs the full
              planned time.
            </ThemedText>
          </View>
          <Switch
            value={fastWorkouts}
            onValueChange={setFastWorkouts}
            trackColor={{ true: theme.tint, false: theme.backgroundSelected }}
            accessibilityLabel="Fast workouts"
          />
        </View>
        <Button title="Add 10 min session" variant="secondary" onPress={() => addDevSession(db, 10 * 60)} />
        <Button title="Add 1 h session" variant="secondary" onPress={() => addDevSession(db, 3600)} />
        <Button
          title="Jump to 2 min before next milestone"
          variant="secondary"
          disabled={nextHours === null}
          onPress={() => jumpToNextMilestone(db, 2 * 60)}
        />
        <Button title="Add 7-day streak" variant="secondary" onPress={() => addDevStreak(db, 7)} />
        <Button title="Reset all data" variant="destructive" onPress={confirmReset} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchText: {
    flex: 1,
    gap: Spacing.half,
  },
});
