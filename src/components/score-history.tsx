import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { formatScoreChange, SCORE_AREAS, type ScoreArea, type ScoreChange } from '@/data/mobility-score';
import type { PastTest } from '@/db/mobility-tests';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, formatShortDate } from '@/lib/dates';

import { Card } from './card';
import { Chip } from './chip';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ScoreHistoryChart } from './score-history-chart';
import { ScrollView } from './scroll-view';
import { ThemedText } from './themed-text';

type Series = 'overall' | ScoreArea;

const SERIES: { id: Series; label: string }[] = [{ id: 'overall', label: 'Overall' }, ...SCORE_AREAS];

const scoreIn = (test: PastTest, series: Series) => (series === 'overall' ? test.overall : test.areas[series]);
const changeIn = (test: PastTest, series: Series) =>
  series === 'overall' ? test.changes?.overall : test.changes?.areas[series];

/**
 * Every past test: a chart of the overall or one area's score over time, and a list of the tests
 * to open one and see its breakdown.
 */
export function ScoreHistory({ tests }: { tests: PastTest[] }) {
  const [series, setSeries] = useState<Series>('overall');
  // The latest test until one is tapped.
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const points = tests
    .flatMap((test) => {
      const score = scoreIn(test, series);
      return score === null ? [] : [{ id: test.id, date: test.date, score }];
    })
    .reverse();
  const selected =
    tests.find((test) => test.id === selectedId && scoreIn(test, series) !== null) ??
    tests.find((test) => scoreIn(test, series) !== null);
  const seriesLabel = SERIES.find(({ id }) => id === series)!.label;

  return (
    <View style={styles.history}>
      <Card style={styles.chartCard}>
        {/* Runs to the card's edges, so chips scroll off them instead of being cut short inside the padding. */}
        <ScrollView
          horizontal
          accessibilityRole="radiogroup"
          accessibilityLabel="Score to chart"
          style={styles.chipList}
          contentContainerStyle={styles.chips}>
          {SERIES.map(({ id, label }) => (
            <Chip key={id} label={label} selected={series === id} onPress={() => setSeries(id)} />
          ))}
        </ScrollView>
        {selected ? (
          <>
            <TestRow test={selected} series={series} />
            <ScoreHistoryChart
              points={points}
              selectedId={selected.id}
              onSelect={setSelectedId}
              label={series === 'overall' ? 'Overall score' : `${seriesLabel} score`}
            />
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No {seriesLabel.toLowerCase()} results yet.
          </ThemedText>
        )}
      </Card>

      <Card style={styles.list}>
        {tests.map((test, i) => (
          <View key={test.id}>
            {i > 0 && <Divider />}
            <TestRow test={test} series="overall" />
          </View>
        ))}
      </Card>
    </View>
  );
}

/** A test's date, score and change since the test before, opening the test when tapped. */
function TestRow({ test, series }: { test: PastTest; series: Series }) {
  const score = scoreIn(test, series);
  const change = changeIn(test, series);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${formatDateKey(test.date)}: ${score === null ? 'no score' : Math.round(score)}${
        change ? `, ${changeLabel(change, 'points')}` : ''
      }`}
      accessibilityHint="Opens this test's breakdown"
      onPress={() => router.push({ pathname: '/past-test/[id]', params: { id: test.id } })}
      style={styles.row}>
      <ThemedText type="smallBold" style={styles.rowDate}>
        {formatShortDate(test.date)}
      </ThemedText>
      {change && <ChangeText change={change} />}
      <ThemedText type="smallBold" style={styles.rowScore}>
        {score === null ? '—' : Math.round(score)}
      </ThemedText>
      <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} color="textSecondary" size={14} />
    </PressableScale>
  );
}

const changeLabel = ({ points, real }: ScoreChange, unit = 'pts') => (real ? formatScoreChange(points, unit) : 'Same');

function ChangeText({ change }: { change: ScoreChange }) {
  return (
    <ThemedText type="small" themeColor={!change.real ? 'textSecondary' : change.points > 0 ? 'tint' : 'danger'}>
      {changeLabel(change)}
    </ThemedText>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

const styles = StyleSheet.create({
  history: {
    gap: Spacing.three,
  },
  chartCard: {
    gap: Spacing.three,
  },
  chipList: {
    marginHorizontal: -Spacing.three,
  },
  chips: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
  list: {
    gap: 0,
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  rowDate: {
    flex: 1,
  },
  /** Fixed width so scores line up from row to row. */
  rowScore: {
    width: 28,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
