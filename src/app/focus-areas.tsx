import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { interpolateColor } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ExerciseTile } from '@/components/exercise-tile';
import { PageHeader } from '@/components/page-header';
import { ScrollView } from '@/components/scroll-view';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { EXERCISES } from '@/data/exercises';
import {
  focusAreas,
  focusTests,
  SCORE_BAND_LABELS,
  SCORE_COLOR_STOPS,
  SCORE_COLORS,
  scoreAreaLabel,
  scoreBand,
  type MobilityScore,
  type ScoreArea,
  type TestScore,
} from '@/data/mobility-score';
import { FLEXIBILITY_TESTS, UNIT_LABELS, type FlexibilityTest, type Side, type Unit } from '@/data/mobility-tests';
import { useMobilityScore } from '@/db/mobility-tests';
import { useTheme } from '@/hooks/use-theme';

const BAR_HEIGHT = 8;
const COLORS = [...SCORE_COLORS];
const SIDE_NAMES: Record<Side, string> = { left: 'Left', right: 'Right' };

const formatValue = (value: number, unit: Unit) => `${value.toFixed(1)}${unit === 'deg' ? '' : ' '}${UNIT_LABELS[unit]}`;

/** The focus areas from the latest test, and the weakest movement in each: what focus routines work on most. */
export default function FocusAreasScreen() {
  const insets = useSafeAreaInsets();
  const score = useMobilityScore();

  if (score === undefined) return <ThemedView style={styles.screen} />;

  const areas = score ? focusAreas(score.areas) : [];
  const tests = score ? focusTests(score.tests, areas) : [];

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <PageHeader eyebrow="From your last test" title="Focus areas" />
        {!score || areas.length === 0 ? (
          <Card style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              Take a flexibility test to find your focus areas.
            </ThemedText>
            <Button title="Take test" variant="secondary" onPress={() => router.push('/mobility-test')} />
          </Card>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Your lowest scoring areas, and the weakest movement in each. Focus routines spend most of their time on
              these areas, and about half of each area&apos;s time on its weakest movement.
            </ThemedText>
            {areas.map((area) => (
              <FocusArea
                key={area}
                area={area}
                score={score}
                weakest={FLEXIBILITY_TESTS.find((test) => test.area === area && tests.includes(test.id))}
              />
            ))}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

/** One focus area: its weakest movement in detail, how its other movements score, and exercises for the weakest. */
function FocusArea({ area, score, weakest }: { area: ScoreArea; score: MobilityScore; weakest: FlexibilityTest | undefined }) {
  const label = scoreAreaLabel(area);
  const areaScore = score.areas[area];
  const others = FLEXIBILITY_TESTS.filter((test) => test.area === area && test !== weakest);
  const exercises = weakest ? EXERCISES.filter((exercise) => exercise.trains?.includes(weakest.id)) : [];

  return (
    <View style={styles.section}>
      <SectionHeader title={areaScore === null ? label : `${label} · ${Math.round(areaScore)}`} />
      {weakest && score.tests[weakest.id] && (
        <Card style={styles.card}>
          <ThemedText type="eyebrow" themeColor="textSecondary">
            Weakest movement
          </ThemedText>
          <Movement test={weakest} score={score.tests[weakest.id]!} detailed />
          <ThemedText type="small" themeColor="textSecondary">
            {weakest.measurement}
          </ThemedText>
        </Card>
      )}
      {others.length > 0 && (
        <Card style={styles.card}>
          <ThemedText type="eyebrow" themeColor="textSecondary">
            Other {label.toLowerCase()} movements
          </ThemedText>
          {others.map((test) => (
            <Movement key={test.id} test={test} score={score.tests[test.id]} />
          ))}
          <Button
            title="See measurements"
            variant="secondary"
            onPress={() => router.push({ pathname: '/score-area/[area]', params: { area } })}
          />
        </Card>
      )}
      {exercises.length > 0 && (
        <>
          <ThemedText type="eyebrow" themeColor="textSecondary" accessibilityRole="header" style={styles.exercisesLabel}>
            Exercises for {weakest!.name.toLowerCase()}
          </ThemedText>
          {exercises.map((exercise) => (
            <ExerciseTile key={exercise.id} exercise={exercise} list={exercises} />
          ))}
        </>
      )}
    </View>
  );
}

/** A movement's score on a bar. `detailed` adds how it compares with others and what each side measured. */
function Movement({ test, score, detailed }: { test: FlexibilityTest; score: TestScore | undefined; detailed?: boolean }) {
  const theme = useTheme();
  const value = score ? Math.min(100, Math.max(0, score.score)) : 0;

  return (
    <View style={styles.movement}>
      <View
        accessible
        accessibilityLabel={
          score ? `${test.movement}: ${Math.round(score.score)}, ${SCORE_BAND_LABELS[scoreBand(score.score)]}` : `${test.movement}: no score`
        }
        style={styles.row}>
        <ThemedText type={detailed ? 'subtitle' : 'small'} style={styles.label}>
          {detailed ? test.name : test.movement}
        </ThemedText>
        {detailed && score && (
          <ThemedText type="small" themeColor="textSecondary">
            {SCORE_BAND_LABELS[scoreBand(score.score)]}
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
      {detailed &&
        score?.results.map((result, i) => {
          const sideScore = result.side ? score.sides[result.side] : undefined;
          return (
            <View key={i} style={styles.row}>
              <ThemedText type="small" style={styles.label}>
                {result.side ? SIDE_NAMES[result.side] : 'Measured'}
              </ThemedText>
              <ThemedText type="smallBold">{formatValue(result.value, result.unit)}</ThemedText>
              {sideScore !== undefined && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.score}>
                  {Math.round(sideScore)}
                </ThemedText>
              )}
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.three,
  },
  exercisesLabel: {
    marginTop: Spacing.two,
  },
  movement: {
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
  /** Fixed width so scores line up from row to row. */
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
