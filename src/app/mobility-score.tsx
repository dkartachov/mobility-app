import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTestSchedule, type TestSchedule } from '@/db/mobility-tests';
import { daysBetween, formatDateKey, todayKey } from '@/lib/dates';

function days(n: number) {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

function lastTestLabel({ lastTestDate }: TestSchedule) {
  if (!lastTestDate) return 'No test taken yet';
  const ago = daysBetween(lastTestDate, todayKey());
  const relative = ago === 0 ? 'today' : `${days(ago)} ago`;
  return `${formatDateKey(lastTestDate)} (${relative})`;
}

function nextTestLabel(schedule: TestSchedule) {
  if (!schedule.lastTestDate) return 'Take your first test to get a baseline.';
  if (schedule.isDue) return "It's test day! Retake the test to track your progress.";
  return `In ${days(schedule.daysUntilNext)}`;
}

export default function MobilityScoreScreen() {
  const insets = useSafeAreaInsets();
  const schedule = useTestSchedule();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Mobility score
          </ThemedText>
          <ThemedText type="stat" themeColor="textSecondary">
            —
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Breakdown by body part coming soon
          </ThemedText>
        </Card>

        {schedule && (
          <Card style={styles.testCard}>
            <ThemedText type="subtitle">Flexibility test</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Last test
            </ThemedText>
            <ThemedText>{lastTestLabel(schedule)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Next test
            </ThemedText>
            <ThemedText themeColor={schedule.isDue ? 'tint' : 'text'}>{nextTestLabel(schedule)}</ThemedText>
            <Button title={schedule.lastTestDate ? 'Retake test' : 'Take first test'} onPress={() => router.push('/mobility-test')}
            />
          </Card>
        )}
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
  testCard: {
    gap: Spacing.two,
  },
});
