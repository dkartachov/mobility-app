import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { PageHeader } from '@/components/page-header';
import { PressableScale } from '@/components/pressable-scale';
import { ScoreBars } from '@/components/score-bars';
import { ScoreBreakdown } from '@/components/score-breakdown';
import { ScoreRing } from '@/components/score-ring';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { formatScoreChange, SCORE_AREAS, scoreChange, type AreaScores } from '@/data/mobility-score';
import { useMobilityScore, useTestSchedule, type TestSchedule } from '@/db/mobility-tests';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey } from '@/lib/dates';

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
        <PageHeader
          eyebrow={schedule?.lastTestDate ? `Last tested ${formatDateKey(schedule.lastTestDate)}` : undefined}
          title="Mobility score"
        />

        <Card style={styles.hero}>
          <View style={styles.ring}>
            <ScoreRing
              score={score?.overall ?? null}
              label="Overall"
              size={200}
              thickness={16}
              delayMs={ANIMATION_DELAY_MS}
            />
            {score === null && (
              <ThemedText type="small" themeColor="textSecondary">
                Take a flexibility test to get your score.
              </ThemedText>
            )}
            {overallChange !== null && (
              <View
                style={[
                  styles.change,
                  { backgroundColor: overallChange < 0 ? `${theme.danger}1F` : theme.tintSoft },
                ]}>
                <ThemedText
                  type="smallBold"
                  themeColor={overallChange > 0 ? 'tint' : overallChange < 0 ? 'danger' : 'textSecondary'}>
                  {formatScoreChange(overallChange)} since last test
                </ThemedText>
              </View>
            )}
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ScoreBars scores={score?.areas ?? NO_SCORES} previous={score?.previous?.areas} delayMs={ANIMATION_DELAY_MS} />
        </Card>

        {schedule && (
          <Card style={styles.testCard}>
            <IconBadge
              name={{ ios: 'calendar', android: 'calendar_month' }}
              color={schedule.isDue ? 'onTint' : 'tint'}
              background={schedule.isDue ? 'tint' : 'tintSoft'}
            />
            <ThemedText type="smallBold" style={styles.testLabel} themeColor={schedule.isDue ? 'tint' : 'text'}>
              {nextTestLabel(schedule)}
            </ThemedText>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={schedule.lastTestDate ? 'Retake test' : 'Take first test'}
              onPress={() => router.push('/mobility-test')}
              pressedScale={0.94}
              style={[styles.retake, { backgroundColor: theme.tint }]}>
              <Icon name={{ ios: 'arrow.counterclockwise', android: 'restart_alt' }} size={18} color="onTint" />
              <ThemedText type="smallBold" themeColor="onTint">
                {schedule.lastTestDate ? 'Retake' : 'Start'}
              </ThemedText>
            </PressableScale>
          </Card>
        )}

        {score && (
          <View style={styles.breakdown}>
            <SectionHeader title="Breakdown" />
            <ScoreBreakdown score={score} />
          </View>
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
    gap: Spacing.three,
  },
  hero: {
    gap: Spacing.four,
    paddingVertical: Spacing.four,
  },
  ring: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  change: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  breakdown: {
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.three,
    height: 40,
    borderRadius: Radius.full,
  },
});
