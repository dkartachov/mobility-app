import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { formatScoreChange, SCORE_AREAS, type ScoreArea, type ScoreChange } from '@/data/mobility-score';
import type { PastTest } from '@/db/mobility-tests';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDateKey, formatShortDate, todayKey } from '@/lib/dates';
import { haptic } from '@/lib/haptics';

import { Card } from './card';
import { Chip } from './chip';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ScoreHistoryChart } from './score-history-chart';
import { ScrollView } from './scroll-view';
import { ThemedText } from './themed-text';

type Series = 'overall' | ScoreArea;

const SERIES: { id: Series; label: string }[] = [{ id: 'overall', label: 'Overall' }, ...SCORE_AREAS];

type Range = '6m' | '1y' | 'all';

/** How far back the chart reaches, in days before today. `null` for every test. */
const RANGES: { id: Range; label: string; spoken: string; days: number | null }[] = [
  { id: '6m', label: '6M', spoken: 'Last 6 months', days: 182 },
  { id: '1y', label: '1Y', spoken: 'Last year', days: 365 },
  { id: 'all', label: 'All', spoken: 'All tests', days: null },
];

/** Tests listed under the chart. The rest are a tap away, on the test history screen. */
export const RECENT_TEST_COUNT = 5;

const scoreIn = (test: PastTest, series: Series) => (series === 'overall' ? test.overall : test.areas[series]);
const changeIn = (test: PastTest, series: Series) =>
  series === 'overall' ? test.changes?.overall : test.changes?.areas[series];

/** The first day a range covers, or `null` for all of them. */
function rangeStart(range: Range, today = todayKey()) {
  const days = RANGES.find(({ id }) => id === range)!.days;
  return days === null ? null : addDays(today, -days);
}

/**
 * Past tests: a chart of the overall or one area's score over the last year (or 6 months, or all
 * of them, once there's more than 6 months to choose from), and the latest few tests to open one
 * and see its breakdown.
 */
export function ScoreHistory({ tests }: { tests: PastTest[] }) {
  const [series, setSeries] = useState<Series>('overall');
  const [range, setRange] = useState<Range>('1y');
  // The latest test in the chart until one is tapped.
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Newest first, like `tests`. Choosing a range only matters once some tests fall outside the shortest.
  const oldest = tests.at(-1)?.date;
  const canChooseRange = oldest !== undefined && oldest < rangeStart('6m')!;
  const start = canChooseRange ? rangeStart(range) : null;
  const charted = tests.filter((test) => scoreIn(test, series) !== null && (start === null || test.date >= start));
  const points = charted.map((test) => ({ id: test.id, date: test.date, score: scoreIn(test, series)! })).reverse();
  const selected = charted.find((test) => test.id === selectedId) ?? charted[0];
  const seriesLabel = SERIES.find(({ id }) => id === series)!.label;
  const hasAnyScore = tests.some((test) => scoreIn(test, series) !== null);

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
            {hasAnyScore
              ? `No ${seriesLabel.toLowerCase()} results in this time.`
              : `No ${seriesLabel.toLowerCase()} results yet.`}
          </ThemedText>
        )}
        {canChooseRange && <RangePicker range={range} onChange={setRange} />}
      </Card>

      <TestList tests={tests.slice(0, RECENT_TEST_COUNT)}>
        {tests.length > RECENT_TEST_COUNT && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`See all ${tests.length} tests`}
            onPress={() => router.push('/test-history')}
            style={styles.row}>
            <ThemedText type="smallBold" themeColor="tint" style={styles.rowDate}>
              See all {tests.length} tests
            </ThemedText>
            <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} color="tint" size={14} />
          </PressableScale>
        )}
      </TestList>
    </View>
  );
}

/** A card of tests, newest first, each with its overall score, then anything in `children` as the last row. */
export function TestList({ tests, children }: { tests: PastTest[]; children?: ReactNode }) {
  return (
    <Card style={styles.list}>
      {tests.map((test, i) => (
        <View key={test.id}>
          {i > 0 && <Divider />}
          <TestRow test={test} series="overall" />
        </View>
      ))}
      {children && (
        <>
          <Divider />
          {children}
        </>
      )}
    </Card>
  );
}

/** A small segmented control for how far back the chart reaches. */
function RangePicker({ range, onChange }: { range: Range; onChange: (range: Range) => void }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Time to chart"
      style={[styles.ranges, { backgroundColor: theme.backgroundSelected }]}>
      {RANGES.map(({ id, label, spoken }) => {
        const selected = id === range;
        return (
          <PressableScale
            key={id}
            accessibilityRole="radio"
            accessibilityLabel={spoken}
            accessibilityState={{ selected }}
            onPress={() => {
              haptic.select();
              onChange(id);
            }}
            style={[styles.range, selected && { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
              {label}
            </ThemedText>
          </PressableScale>
        );
      })}
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
  ranges: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: Spacing.half,
    borderRadius: Radius.full,
  },
  range: {
    minWidth: 56,
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.full,
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
