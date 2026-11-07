import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { PageHeader } from '@/components/page-header';
import { ScoreChangePill } from '@/components/pill';
import { ScoreBars } from '@/components/score-bars';
import { ScoreBreakdown } from '@/components/score-breakdown';
import { ScoreRing } from '@/components/score-ring';
import { ScrollView } from '@/components/scroll-view';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SCORE_BAND_LABELS, scoreBand } from '@/data/mobility-score';
import { useTestHistory } from '@/db/mobility-tests';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, formatShortDate } from '@/lib/dates';

/** Lets the screen finish sliding in before the score animates. */
const ANIMATION_DELAY_MS = 300;

/** One past flexibility test's score and breakdown, compared with the test before it. */
export default function PastTestScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const history = useTestHistory();
  const index = history?.findIndex((test) => test.id === Number(id)) ?? -1;
  const test = history?.[index];
  const before = history?.[index + 1];

  if (!history) return <ThemedView style={styles.screen} />;

  if (!test) {
    return (
      <ThemedView style={[styles.screen, styles.notFound]}>
        <ThemedText themeColor="textSecondary">This test doesn&apos;t exist.</ThemedText>
      </ThemedView>
    );
  }

  const overallChange = test.changes?.overall ?? null;
  const since = before ? ` since ${formatShortDate(before.date)}` : '';

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <PageHeader eyebrow={index === 0 ? 'Latest test' : 'Past test'} title={formatDateKey(test.date)} />

        <Card style={styles.hero}>
          <View style={styles.ring}>
            <ScoreRing score={test.overall} label="Overall" size={180} thickness={14} delayMs={ANIMATION_DELAY_MS} />
            {test.overall !== null && <ThemedText type="smallBold">{SCORE_BAND_LABELS[scoreBand(test.overall)]}</ThemedText>}
            {overallChange !== null && <ScoreChangePill change={overallChange} suffix={since} explainable />}
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ScoreBars scores={test.areas} changes={test.changes?.areas} delayMs={ANIMATION_DELAY_MS} barHeight={140} />
        </Card>

        <View style={styles.breakdown}>
          <SectionHeader title="Breakdown" />
          <ScoreBreakdown score={test} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  notFound: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.screen,
  },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  hero: {
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  ring: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  breakdown: {
    gap: Spacing.three,
  },
});
