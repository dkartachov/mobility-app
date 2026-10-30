import { router, Stack, usePreventRemove } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { PageHeader } from '@/components/page-header';
import { ProgressBar } from '@/components/progress-bar';
import { ScoreBars } from '@/components/score-bars';
import { ScoreBreakdown } from '@/components/score-breakdown';
import { ScoreRing } from '@/components/score-ring';
import { ScrollView } from '@/components/scroll-view';
import { TestMeasurement } from '@/components/test-measurement';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { formatScoreChange, SCORE_AREAS, SCORE_BAND_LABELS, scoreBand, scoreChange } from '@/data/mobility-score';
import {
  BODY_MEASUREMENT_LABELS,
  DEFAULT_BODY,
  FLEXIBILITY_TESTS,
  METHOD_UNITS,
  SIDE_LABELS,
  TEST_STEPS,
} from '@/data/mobility-tests';
import { logMobilityTest, useMobilityScore } from '@/db/mobility-tests';
import { useProfile } from '@/db/profile';
import { useTheme } from '@/hooks/use-theme';
import { useSkipTestMeasurements } from '@/lib/dev-settings';

/** The calculating screen shows at least this long, even when saving is quicker. */
const CALCULATING_MS = 2000;

/** Lets the results fade in before the score animates. */
const ANIMATION_DELAY_MS = 300;

const TIPS = [
  'Test at the same time of day, ideally before a workout.',
  'Do the same warm-up every time, or none at all.',
  'Move slowly into each position and stop at a firm stretch, never pain.',
  'Measure the same way each time so results are comparable.',
];

const BODY_MEASUREMENT_KEYS = Object.keys(BODY_MEASUREMENT_LABELS) as (keyof typeof BODY_MEASUREMENT_LABELS)[];

const AREA_LABELS = Object.fromEntries(SCORE_AREAS.map(({ id, label }) => [id, label]));

/** 'calculating' turns into 'results' on its own, once the save is done and the minimum time is up. */
type Phase = 'intro' | 'measuring' | 'calculating';

export default function MobilityTestScreen() {
  const db = useSQLiteContext();
  const [startedPhase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<(number | null)[]>(() => TEST_STEPS.map(() => null));
  const [leaving, setLeaving] = useState<'cancel' | 'done'>();
  const [saving, setSaving] = useState<'pending' | 'saved' | 'failed'>('pending');
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const skipMeasurements = useSkipTestMeasurements();
  // The results read the score back from the database, so they wait for the save to finish.
  const phase = startedPhase === 'calculating' && minTimeElapsed && saving !== 'pending' ? 'results' : startedPhase;

  // Mid-test, leaving loses the measurements; on the results screen it means "done".
  usePreventRemove(phase !== 'intro' && !leaving, () => {
    if (phase === 'measuring') {
      Alert.alert('Stop the test?', "Your measurements won't be saved.", [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Stop test', style: 'destructive', onPress: () => setLeaving('cancel') },
      ]);
    } else if (phase === 'results') {
      setLeaving('done');
    }
  });
  // Runs after the re-render that lifts the prevention above, so this navigation isn't blocked.
  useEffect(() => {
    if (leaving === 'cancel') router.back();
    if (leaving === 'done') router.dismissTo('/dashboard');
  }, [leaving]);

  useEffect(() => {
    if (startedPhase !== 'calculating') return;
    const id = setTimeout(() => setMinTimeElapsed(true), CALCULATING_MS);
    return () => clearTimeout(id);
  }, [startedPhase]);

  const finish = async () => {
    setPhase('calculating');
    await logMobilityTest(
      db,
      new Date(),
      // Every step has a value by now: Next stays disabled until it does, unless the dev switch
      // to skip measurements is on, which saves skipped ones as 0.
      TEST_STEPS.flatMap(({ test, side }, i) => {
        const value = values[i] ?? (skipMeasurements ? 0 : null);
        return value === null ? [] : [{ exerciseId: test.id, side, value, unit: METHOD_UNITS[test.method.kind] }];
      })
    ).then(
      () => setSaving('saved'),
      (error) => {
        console.error(error);
        setSaving('failed');
      }
    );
  };

  const next = () => {
    if (index === TEST_STEPS.length - 1) {
      finish();
      return;
    }
    // A slider's second side starts where the first side left off. Phone tests always start fresh.
    const nextStep = TEST_STEPS[index + 1];
    if (nextStep.test === TEST_STEPS[index].test && nextStep.test.method.kind === 'distance') {
      setValues((prev) => prev.map((v, i) => (i === index + 1 && v === null ? prev[index] : v)));
    }
    setIndex(index + 1);
  };

  const fullScreen = phase === 'calculating' || phase === 'results';

  return (
    <>
      <Stack.Screen
        options={{
          title: phase === 'measuring' ? `${index + 1} of ${TEST_STEPS.length}` : '',
          headerShown: !fullScreen,
          gestureEnabled: !fullScreen,
        }}
      />
      {phase === 'intro' && <Intro onStart={() => setPhase('measuring')} />}
      {phase === 'measuring' && (
        <Measure
          key={index}
          index={index}
          value={values[index]}
          onChange={(value) => setValues((prev) => prev.map((v, i) => (i === index ? value : v)))}
          onBack={index > 0 ? () => setIndex(index - 1) : undefined}
          onNext={next}
          canSkip={skipMeasurements}
        />
      )}
      {phase === 'calculating' && <Calculating />}
      {phase === 'results' && <Results saveFailed={saving === 'failed'} onDone={() => setLeaving('done')} />}
    </>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  const insets = useSafeAreaInsets();
  const profile = useProfile();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          eyebrow="About 20 minutes"
          title="Flexibility test"
          subtitle={`${FLEXIBILITY_TESTS.length} tests, ${TEST_STEPS.length} measurements in total.`}
        />
        <Card style={styles.introCard}>
          <CardTitle icon={{ ios: 'lightbulb.fill', android: 'lightbulb' }} title="For accurate results" />
          {TIPS.map((tip) => (
            <View key={tip} style={styles.tip}>
              <Icon name={{ ios: 'checkmark.circle.fill', android: 'check_circle' }} color="tint" size={18} />
              <ThemedText style={styles.tipText}>{tip}</ThemedText>
            </View>
          ))}
        </Card>
        <Card style={styles.introCard}>
          <CardTitle icon={{ ios: 'shippingbox.fill', android: 'inventory_2' }} title="You'll need" />
          <ThemedText>
            A clear wall, some floor space, a stair or sturdy box, a table, a tape measure, a strap to hold the phone to
            your leg, a towel or belt (anything that doesn&apos;t stretch), and a partner for the hip rotation tests.
          </ThemedText>
        </Card>
        <Card style={styles.introCard}>
          <CardTitle icon={{ ios: 'ruler.fill', android: 'straighten' }} title="Your body measurements" />
          <ThemedText themeColor="textSecondary">
            Used to make the hints during the test match your body. Anything you haven&apos;t entered uses an
            average size.
          </ThemedText>
          {profile &&
            BODY_MEASUREMENT_KEYS.map((key) => {
              const own = profile.body[key];
              const fallback = DEFAULT_BODY[key];
              return (
                <View key={key} style={styles.partRow}>
                  <ThemedText>{BODY_MEASUREMENT_LABELS[key]}</ThemedText>
                  {own !== null ? (
                    <ThemedText>{own} cm</ThemedText>
                  ) : (
                    <ThemedText themeColor="textSecondary">
                      {fallback === null ? 'Not set' : `${fallback} cm (default)`}
                    </ThemedText>
                  )}
                </View>
              );
            })}
          <Button
            title="Update measurements"
            variant="secondary"
            onPress={() => router.push('/edit-profile?section=body')}
          />
        </Card>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button title="Start test" onPress={onStart} />
      </View>
    </ThemedView>
  );
}

type MeasureProps = {
  index: number;
  value: number | null;
  onChange: (value: number | null) => void;
  onBack?: () => void;
  onNext: () => void;
  /** Dev switch: Next works without a measurement. */
  canSkip: boolean;
};

function Measure({ index, value, onChange, onBack, onNext, canSkip }: MeasureProps) {
  const insets = useSafeAreaInsets();
  const { test, side } = TEST_STEPS[index];
  const last = index === TEST_STEPS.length - 1;

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.progress}>
        <ProgressBar progress={(index + 1) / TEST_STEPS.length} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
       
        keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <View style={styles.headingRow}>
            <ThemedText type="eyebrow" themeColor="tint">
              {AREA_LABELS[test.area]}
            </ThemedText>
            {side && <SidePill label={SIDE_LABELS[side]} />}
          </View>
          {/* One line even for long names like "Shoulder external rotation", shrinking if it has to. */}
          <ThemedText
            type="title"
            style={styles.testName}
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            {test.name}
          </ThemedText>
        </View>
        <ThemedText>{test.instructions}</ThemedText>
      </ScrollView>
      {/* Outside the scroll view, so the reading and Cancel stay in view however long the instructions are. */}
      <View style={styles.measurement}>
        <TestMeasurement test={test} value={value} onChange={onChange} />
      </View>
      <View style={[styles.footer, styles.footerRow, { paddingBottom: insets.bottom + Spacing.three }]}>
        {onBack && (
          <View style={styles.footerButton}>
            <Button title="Back" variant="secondary" onPress={onBack} />
          </View>
        )}
        <View style={styles.footerButton}>
          <Button title={last ? 'Finish' : 'Next'} onPress={onNext} disabled={value === null && !canSkip} />
        </View>
      </View>
    </ThemedView>
  );
}

function Calculating() {
  const theme = useTheme();

  return (
    <ThemedView style={[styles.screen, styles.centeredScreen]}>
      <View style={[styles.spinner, { backgroundColor: theme.tintSoft }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
      <ThemedText type="subtitle">Calculating mobility score…</ThemedText>
    </ThemedView>
  );
}

function CardTitle({ icon, title }: { icon: ComponentProps<typeof IconBadge>['name']; title: string }) {
  return (
    <View style={styles.cardTitle}>
      <IconBadge name={icon} size={32} />
      <ThemedText type="smallBold">{title}</ThemedText>
    </View>
  );
}

function SidePill({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.sidePill, { backgroundColor: theme.tintSoft }]}>
      <Icon name={{ ios: 'arrow.left.and.right', android: 'swap_horiz' }} color="tint" size={16} />
      <ThemedText type="smallBold" themeColor="tint">
        {label}
      </ThemedText>
    </View>
  );
}

function Results({ saveFailed, onDone }: { saveFailed: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  // The test just saved is the latest one, so this is its score.
  const loaded = useMobilityScore();
  const score = saveFailed ? null : loaded;
  const overall = score?.overall ?? null;
  const overallChange = score ? scoreChange(score.overall, score.previous?.overall) : null;

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeIn} style={styles.resultsHeader}>
          <ThemedText type="eyebrow" themeColor="tint">
            Test complete
          </ThemedText>
          <ScoreRing score={overall} label="Mobility score" size={180} thickness={14} delayMs={ANIMATION_DELAY_MS} />
          {saveFailed ? (
            <ThemedText type="small" themeColor="danger">
              Your measurements couldn&apos;t be saved. Please try the test again.
            </ThemedText>
          ) : (
            overall !== null && <ThemedText type="smallBold">{SCORE_BAND_LABELS[scoreBand(overall)]}</ThemedText>
          )}
          {overallChange !== null && (
            <View
              style={[styles.change, { backgroundColor: overallChange < 0 ? `${theme.danger}1F` : theme.tintSoft }]}>
              <ThemedText
                type="smallBold"
                themeColor={overallChange > 0 ? 'tint' : overallChange < 0 ? 'danger' : 'textSecondary'}>
                {formatScoreChange(overallChange)} since last test
              </ThemedText>
            </View>
          )}
        </Animated.View>
        {score && (
          <>
            <Card style={styles.introCard}>
              <CardTitle
                icon={{ ios: 'chart.bar.fill', android: 'bar_chart' }}
                title={score.previous ? 'Improvement by area' : 'By area'}
              />
              <ScoreBars scores={score.areas} previous={score.previous?.areas} delayMs={ANIMATION_DELAY_MS} />
            </Card>
            <ScoreBreakdown score={score} />
          </>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button title="Done" onPress={onDone} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centeredScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  progress: {
    paddingHorizontal: Spacing.three,
  },
  heading: {
    gap: Spacing.one,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  testName: {
    fontSize: 26,
    lineHeight: 32,
  },
  measurement: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  introCard: {
    gap: Spacing.three,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
  },
  sidePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
  },
  spinner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two + Spacing.one,
    paddingTop: Spacing.half,
  },
  tipText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  footerButton: {
    flex: 1,
  },
  resultsHeader: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.four,
  },
  change: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
  },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
