import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScoreBars } from '@/components/score-bars';
import { ScoreRing } from '@/components/score-ring';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SCORE_AREAS, type AreaScores } from '@/data/mobility-score';
import { useMobilityScore, useTestSchedule, type TestSchedule } from '@/db/mobility-tests';
import { daysBetween, formatDateKey, todayKey } from '@/lib/dates';

/** Lets the screen finish sliding in before the score animates. */
const ANIMATION_DELAY_MS = 300;

const NO_SCORES = Object.fromEntries(SCORE_AREAS.map(({ id }) => [id, null])) as AreaScores;

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
  const score = useMobilityScore();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Card style={styles.scoreCard}>
          <ThemedText type="subtitle">Mobility score</ThemedText>
          <View style={styles.ring}>
            <ScoreRing score={score?.overall ?? null} label="Overall" delayMs={ANIMATION_DELAY_MS} />
          </View>
          <ScoreBars scores={score?.areas ?? NO_SCORES} delayMs={ANIMATION_DELAY_MS} />
          {score === null && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
              Take a flexibility test to get your score.
            </ThemedText>
          )}
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
  scoreCard: {
    gap: Spacing.four,
  },
  ring: {
    alignItems: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  testCard: {
    gap: Spacing.two,
  },
});
