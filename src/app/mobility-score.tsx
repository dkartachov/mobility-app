import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ScoreBars } from '@/components/score-bars';
import { ScoreRing } from '@/components/score-ring';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatScoreChange, SCORE_AREAS, scoreChange, type AreaScores } from '@/data/mobility-score';
import { useMobilityScore, useTestSchedule, type TestSchedule } from '@/db/mobility-tests';
import { useTheme } from '@/hooks/use-theme';

/** Lets the screen finish sliding in before the score animates. */
const ANIMATION_DELAY_MS = 300;

const NO_SCORES = Object.fromEntries(SCORE_AREAS.map(({ id }) => [id, null])) as AreaScores;

function nextTestLabel(schedule: TestSchedule) {
  if (!schedule.lastTestDate) return 'Take your first test';
  if (schedule.isDue) return "It's test day!";
  const n = schedule.daysUntilNext;
  return `Next test in ${n} ${n === 1 ? 'day' : 'days'}`;
}

export default function MobilityScoreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const schedule = useTestSchedule();
  const score = useMobilityScore();
  const overallChange = score ? scoreChange(score.overall, score.previous?.overall) : null;

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <ThemedText type="title" accessibilityRole="header">
          Mobility score
        </ThemedText>
        <View style={styles.ring}>
          <ScoreRing score={score?.overall ?? null} label="Overall" size={200} thickness={16} delayMs={ANIMATION_DELAY_MS} />
          {score === null && (
            <ThemedText type="small" themeColor="textSecondary">
              Take a flexibility test to get your score.
            </ThemedText>
          )}
          {overallChange !== null && (
            <ThemedText
              type="smallBold"
              themeColor={overallChange > 0 ? 'tint' : overallChange < 0 ? 'danger' : 'textSecondary'}>
              {formatScoreChange(overallChange)} since last test
            </ThemedText>
          )}
        </View>
        <ScoreBars scores={score?.areas ?? NO_SCORES} previous={score?.previous?.areas} delayMs={ANIMATION_DELAY_MS} />

        {schedule && (
          <Card style={styles.testCard}>
            <ThemedText style={styles.testLabel} themeColor={schedule.isDue ? 'tint' : 'text'}>
              {nextTestLabel(schedule)}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={schedule.lastTestDate ? 'Retake test' : 'Take first test'}
              onPress={() => router.push('/mobility-test')}
              style={({ pressed }) => [styles.retake, { backgroundColor: theme.tint }, pressed && styles.pressed]}>
              <Icon name={{ ios: 'arrow.counterclockwise', android: 'restart_alt' }} size={22} color="onTint" />
            </Pressable>
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
    gap: Spacing.five,
  },
  ring: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  testCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  testLabel: {
    flex: 1,
  },
  retake: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
