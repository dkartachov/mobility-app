import { StyleSheet, View } from 'react-native';
import { interpolateColor } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { SCORE_AREAS, SCORE_COLOR_STOPS, SCORE_COLORS, type MobilityScore, type TestScore } from '@/data/mobility-score';
import { FLEXIBILITY_TESTS, type FlexibilityTest } from '@/data/mobility-tests';
import { useTheme } from '@/hooks/use-theme';

import { Card } from './card';
import { ThemedText } from './themed-text';

const BAR_HEIGHT = 6;
const COLORS = [...SCORE_COLORS];

/** A card per score area, listing the score of each movement in it and of each side. */
export function ScoreBreakdown({ score }: { score: MobilityScore }) {
  return (
    <View style={styles.list}>
      {SCORE_AREAS.map(({ id, label }) => {
        const areaScore = score.areas[id];
        return (
          <Card key={id}>
            <View style={styles.row}>
              <ThemedText type="smallBold" style={styles.label}>
                {label}
              </ThemedText>
              <ThemedText
                type="smallBold"
                themeColor={areaScore === null ? 'textSecondary' : 'text'}
                style={styles.score}>
                {areaScore === null ? '—' : Math.round(areaScore)}
              </ThemedText>
            </View>
            {FLEXIBILITY_TESTS.filter((test) => test.area === id).map((test) => (
              <MovementRow key={test.id} test={test} score={score.tests[test.id]} />
            ))}
          </Card>
        );
      })}
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
