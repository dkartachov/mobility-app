import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { StyleSheet, Switch, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import {
  addDevMobilityTest,
  addDevMobilityTestResults,
  addDevSession,
  addDevTrainingDays,
  clearDevMobilityTests,
  clearDevSessions,
  jumpToNextMilestone,
  makeDevTestDue,
} from '@/db/dev';
import { RETEST_INTERVAL_DAYS } from '@/db/mobility-tests';
import { resetAllData } from '@/db/reset';
import { useStats } from '@/db/sessions';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/dates';
import {
  setFastWorkouts,
  setSkipTestMeasurements,
  useFastWorkouts,
  useSkipTestMeasurements,
} from '@/lib/dev-settings';
import { milestoneProgress } from '@/lib/milestones';
import { FAST_BUFFER_SECONDS, FAST_STEP_SECONDS } from '@/lib/workout';

import { Button } from './button';
import { Card } from './card';
import { showDialog } from './dialog';
import { ThemedText } from './themed-text';

/** Settings section for faking data during development. Render it behind `__DEV__` only. */
export function DevTools() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const stats = useStats();
  const fastWorkouts = useFastWorkouts();
  const skipTestMeasurements = useSkipTestMeasurements();
  const nextHours = stats ? milestoneProgress(stats.totalSeconds).nextHours : null;

  const confirm = (title: string, message: string, action: (db: SQLiteDatabase) => Promise<void>) => {
    showDialog({ title, message, confirm: { label: 'Delete', onPress: () => action(db) } });
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
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <ThemedText>Skip test measurements</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Next works in flexibility tests without measuring. Skipped measurements save as 0.
            </ThemedText>
          </View>
          <Switch
            value={skipTestMeasurements}
            onValueChange={setSkipTestMeasurements}
            trackColor={{ true: theme.tint, false: theme.backgroundSelected }}
            accessibilityLabel="Skip test measurements"
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
        <Button title="Add 7 training days" variant="secondary" onPress={() => addDevTrainingDays(db, 7)} />
        <Button title="Log flexibility test today" variant="secondary" onPress={() => addDevMobilityTest(db)} />
        <Button
          title="Make up test results"
          variant="secondary"
          onPress={() => addDevMobilityTestResults(db)}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Adds a test today, moving earlier tests back {RETEST_INTERVAL_DAYS} days so they build a history.
        </ThemedText>
        <Button title="Make today test day" variant="secondary" onPress={() => makeDevTestDue(db)} />
      </Card>
      <Card style={styles.card}>
        <ThemedText type="smallBold">Clear data</ThemedText>
        <Button
          title="Clear flexibility tests"
          variant="destructive"
          onPress={() =>
            confirm(
              'Clear flexibility tests?',
              'Deletes every flexibility test and its results, so a test is due right away.',
              clearDevMobilityTests
            )
          }
        />
        <Button
          title="Clear sessions"
          variant="destructive"
          onPress={() =>
            confirm('Clear sessions?', 'Deletes every logged session, including milestones.', clearDevSessions)
          }
        />
        <Button
          title="Reset all data"
          variant="destructive"
          onPress={() =>
            confirm(
              'Reset all data?',
              'Deletes sessions and flexibility tests and clears your profile.',
              resetAllData
            )
          }
        />
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
