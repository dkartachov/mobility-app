import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { interpolateColor } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { SCORE_AREAS, SCORE_COLOR_STOPS, SCORE_COLORS, type MobilityScore, type TestScore } from '@/data/mobility-score';
import { FLEXIBILITY_TESTS, type FlexibilityTest } from '@/data/mobility-tests';
import { useTheme } from '@/hooks/use-theme';

import { Card } from './card';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

const BAR_HEIGHT = 6;
const COLORS = [...SCORE_COLORS];

/**
 * A card per score area, listing the score of each movement in it and of each side. Tapping a card
 * opens the area's measurements and how they compare. `testId` picks a past test, else the latest.
 */
export function ScoreBreakdown({ score, testId }: { score: MobilityScore; testId?: number }) {
  return (
    <View style={styles.list}>
      {SCORE_AREAS.map(({ id, label }) => {
        const areaScore = score.areas[id];
        return (
          <PressableScale
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${areaScore === null ? 'no score' : Math.round(areaScore)}. See measurements`}
            onPress={() => router.push({ pathname: '/score-area/[area]', params: { area: id, testId } })}
            pressedScale={0.98}>
            <Card>
              <AreaHeader label={label} score={areaScore} />
              {FLEXIBILITY_TESTS.filter((test) => test.area === id).map((test) => (
                <MovementRow key={test.id} test={test} score={score.tests[test.id]} />
              ))}
            </Card>
          </PressableScale>
        );
      })}
    </View>
  );
}

function AreaHeader({ label, score }: { label: string; score: number | null }) {
  return (
    <View style={styles.row}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" themeColor={score === null ? 'textSecondary' : 'text'} style={styles.score}>
        {score === null ? '—' : Math.round(score)}
      </ThemedText>
      <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} color="textSecondary" size={14} />
    </View>
  );
}

function MovementRow({ test, score }: { test: FlexibilityTest; score: TestScore | undefined }) {
  const theme = useTheme();
  const { left, right } = score?.sides ?? {};
  const hasSides = left !== undefined && right !== undefined;
  const value = score ? Math.min(100, Math.max(0, score.score)) : 0;

  return (
    <View
      accessible
      accessibilityLabel={
        score
          ? `${test.movement}: ${Math.round(score.score)}${hasSides ? `, left ${Math.round(left)}, right ${Math.round(right)}` : ''}`
          : `${test.movement}: no score`
      }
      style={styles.movement}>
      <View style={styles.row}>
        <ThemedText type="small" style={styles.label}>
          {test.movement}
        </ThemedText>
        {hasSides && (
          <ThemedText type="small" themeColor="textSecondary">
            L {Math.round(left)} · R {Math.round(right)}
          </ThemedText>
        )}
        <ThemedText type="smallBold" themeColor={score ? 'text' : 'textSecondary'} style={styles.score}>
          {score ? Math.round(score.score) : '—'}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        {score && (
          <View
            style={[
              styles.fill,
              { width: `${value}%`, backgroundColor: interpolateColor(value / 100, SCORE_COLOR_STOPS, COLORS) },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  movement: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    flex: 1,
  },
  /** Fixed width so the side scores line up from row to row. */
  score: {
    width: 28,
    textAlign: 'right',
  },
  track: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BAR_HEIGHT / 2,
  },
});
