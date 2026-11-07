import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { interpolateColor } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { PageHeader } from '@/components/page-header';
import { ScoreRing } from '@/components/score-ring';
import { ScrollView } from '@/components/scroll-view';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  SCORE_AREAS,
  SCORE_BAND_LABELS,
  SCORE_COLOR_STOPS,
  SCORE_COLORS,
  bandRanges,
  normAt,
  scoreBand,
  type Demographics,
  type ScoreBand,
} from '@/data/mobility-score';
import {
  FLEXIBILITY_TESTS,
  METHOD_UNITS,
  UNIT_LABELS,
  type FlexibilityTest,
  type Side,
  type Unit,
} from '@/data/mobility-tests';
import { useTestHistory, type PastTest } from '@/db/mobility-tests';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey } from '@/lib/dates';

/** Lets the screen finish sliding in before the score animates. */
const ANIMATION_DELAY_MS = 300;
/** The scale runs this many standard deviations either side of the average. */
const SCALE_SDS = 2.5;

const SIDE_NAMES: Record<Side, string> = { left: 'Left', right: 'Right' };
/** Lowest band first, as the scale and the values read. */
const BANDS_ASCENDING: ScoreBand[] = ['wellBelow', 'below', 'average', 'above', 'wellAbove'];
const BAND_PERCENTILES: Record<ScoreBand, string> = {
  wellBelow: '0–10',
  below: '10–25',
  average: '25–75',
  above: '75–90',
  wellAbove: '90–100',
};
/** The middle of each band's percentiles, coloured on the same scale as the score bars. */
const BAND_MIDPOINT: Record<ScoreBand, number> = { wellBelow: 5, below: 17.5, average: 50, above: 82.5, wellAbove: 95 };
const COLORS = [...SCORE_COLORS];

const formatValue = (value: number, unit: Unit) => `${value.toFixed(1)}${unit === 'deg' ? '' : ' '}${UNIT_LABELS[unit]}`;

/** "Under 120.0°", "120.0° – 124.7°" or "140.0° and over". */
function formatRange(min: number, max: number, unit: Unit) {
  if (min === -Infinity) return `Under ${formatValue(max, unit)}`;
  if (max === Infinity) return `${formatValue(min, unit)} and over`;
  return `${formatValue(min, unit)} – ${formatValue(max, unit)}`;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function comparedWith({ sex, age }: Demographics) {
  const who = sex === 'male' ? 'men' : sex === 'female' ? 'women' : 'men and women';
  const ageText = age === null ? '' : ` aged ${age}`;
  const hint =
    sex === null || age === null
      ? ' Add your sex and date of birth in your profile to compare with people like you.'
      : '';
  return `Compared with healthy ${who}${ageText}.${hint}`;
}

export default function ScoreAreaScreen() {
  const insets = useSafeAreaInsets();
  const { area, testId } = useLocalSearchParams<{ area: string; testId?: string }>();
  const history = useTestHistory();
  const info = SCORE_AREAS.find((a) => a.id === area);
  // History is newest first, so without a test id this is the latest.
  const test = history?.find((t) => testId === undefined || t.id === Number(testId));

  if (!history) return <ThemedView style={styles.screen} />;

  if (!info || !test) {
    return (
      <ThemedView style={[styles.screen, styles.notFound]}>
        <ThemedText themeColor="textSecondary">This score doesn&apos;t exist.</ThemedText>
      </ThemedView>
    );
  }

  const areaScore = test.areas[info.id];
  const tests = FLEXIBILITY_TESTS.filter((t) => t.area === info.id);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <PageHeader eyebrow={`Tested ${formatDateKey(test.date)}`} title={info.label} />

        <Card style={styles.hero}>
          <View style={styles.ring}>
            <ScoreRing score={areaScore} label={info.label} size={160} thickness={12} delayMs={ANIMATION_DELAY_MS} />
            {areaScore !== null && <ThemedText type="smallBold">{SCORE_BAND_LABELS[scoreBand(areaScore)]}</ThemedText>}
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            {comparedWith(test.demographics)}
          </ThemedText>
        </Card>

        <View style={styles.section}>
          <SectionHeader title="Measurements" />
          {tests.map((t) => (
            <MeasurementCard key={t.id} test={t} past={test} />
          ))}
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          For every measurement here, higher is better. The bands are the values where each percentile starts among
          healthy adults like you, from the same norms as your score.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

/** One test: what was measured, where it falls on the scale, and the bands in the test's units. */
function MeasurementCard({ test, past }: { test: FlexibilityTest; past: PastTest }) {
  const theme = useTheme();
  const scored = past.tests[test.id];
  const unit = METHOD_UNITS[test.method.kind];
  const { mean, sd } = normAt(test.norm, past.demographics);
  const low = mean - SCALE_SDS * sd;
  const high = mean + SCALE_SDS * sd;
  const position = (value: number) => clamp01((value - low) / (high - low));

  const ranges = bandRanges(test, past.demographics);
  const yours = (scored?.results ?? []).map((result) => {
    const score = result.side && scored?.sides[result.side] !== undefined ? scored.sides[result.side]! : scored!.score;
    return { side: result.side, value: result.value, score, band: scoreBand(score) };
  });
  const yourBands = new Set(yours.map((y) => y.band));

  return (
    <Card style={styles.measurement}>
      <View style={styles.measurementHeader}>
        <ThemedText type="smallBold">{test.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {test.measurement}
        </ThemedText>
      </View>

      {yours.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Not measured in this test.
        </ThemedText>
      ) : (
        <View style={styles.results}>
          {yours.map((y, i) => (
            <View key={i} style={styles.row}>
              <ThemedText type="small" style={styles.label}>
                {y.side ? SIDE_NAMES[y.side] : 'Measured'}
              </ThemedText>
              <ThemedText type="smallBold">{formatValue(y.value, unit)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.scoreText}>
                {Math.round(y.score)} · {SCORE_BAND_LABELS[y.band]}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.scale, { backgroundColor: theme.backgroundSelected }]}>
        {ranges.map(({ band, min, max }) => {
          const start = position(min);
          const end = position(max);
          return (
            <View
              key={band}
              style={[
                styles.segment,
                {
                  left: `${start * 100}%`,
                  width: `${(end - start) * 100}%`,
                  backgroundColor: interpolateColor(BAND_MIDPOINT[band] / 100, SCORE_COLOR_STOPS, COLORS),
                },
              ]}
            />
          );
        })}
        {yours.map((y, i) => (
          <View
            key={i}
            style={[
              styles.marker,
              { left: `${position(y.value) * 100}%`, backgroundColor: theme.text, borderColor: theme.background },
            ]}
          />
        ))}
      </View>

      <View style={[styles.grid, { borderColor: theme.border }]}>
        {[...BANDS_ASCENDING].reverse().map((band) => {
          const range = ranges.find((r) => r.band === band)!;
          const isYours = yourBands.has(band);
          return (
            <View
              key={band}
              style={[styles.gridRow, isYours && { backgroundColor: theme.backgroundSelected }]}
              accessibilityLabel={`${SCORE_BAND_LABELS[band]}, ${BAND_PERCENTILES[band]} percentile, ${formatRange(range.min, range.max, unit)}${isYours ? ', your result' : ''}`}>
              <ThemedText type={isYours ? 'smallBold' : 'small'} style={styles.label}>
                {SCORE_BAND_LABELS[band]}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.percentile}>
                {BAND_PERCENTILES[band]}
              </ThemedText>
              <ThemedText type={isYours ? 'smallBold' : 'small'} style={styles.rangeText}>
                {formatRange(range.min, range.max, unit)}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </Card>
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
  centered: {
    textAlign: 'center',
  },
  section: {
    gap: Spacing.three,
  },
  measurement: {
    gap: Spacing.three,
  },
  measurementHeader: {
    gap: Spacing.one,
  },
  results: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    flex: 1,
  },
  scoreText: {
    textAlign: 'right',
  },
  /** The scale: a bar of coloured bands, with a dot where each result falls. */
  scale: {
    height: 12,
    borderRadius: 6,
    marginVertical: Spacing.two,
  },
  segment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  marker: {
    position: 'absolute',
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10,
    borderWidth: 3,
  },
  grid: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  percentile: {
    width: 56,
  },
  rangeText: {
    textAlign: 'right',
    flexShrink: 1,
  },
});
