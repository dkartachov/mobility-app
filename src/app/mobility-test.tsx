import { router, Stack, usePreventRemove } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { showDialog } from '@/components/dialog';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { PageHeader } from '@/components/page-header';
import { Pill, ScoreChangePill } from '@/components/pill';
import { ProgressBar } from '@/components/progress-bar';
import { ScoreBars } from '@/components/score-bars';
import { ScoreBreakdown } from '@/components/score-breakdown';
import { ScoreRing } from '@/components/score-ring';
import { ScrollView } from '@/components/scroll-view';
import { TestMeasurement } from '@/components/test-measurement';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkoutPlayer } from '@/components/workout-player';
import { Spacing } from '@/constants/theme';
import { SCORE_AREAS, SCORE_BAND_LABELS, scoreBand, scoreChange } from '@/data/mobility-score';
import { FLEXIBILITY_TESTS, METHOD_UNITS, SIDE_LABELS, TEST_STEPS } from '@/data/mobility-tests';
import {
  TEST_WARMUP,
  WARMUP_BUFFER_SECONDS,
  WARMUP_MINUTES,
  WARMUP_SIDE_SWITCH_SECONDS,
} from '@/data/test-warmup';
import { logMobilityTest, useMobilityScore } from '@/db/mobility-tests';
import { useTheme } from '@/hooks/use-theme';
import { getFastWorkouts, useSkipTestMeasurements } from '@/lib/dev-settings';
import { FAST_BUFFER_SECONDS, FAST_STEP_SECONDS } from '@/lib/workout';

/** The calculating screen shows at least this long, even when saving is quicker. */
const CALCULATING_MS = 2000;

/** Lets the results fade in before the score animates. */
const ANIMATION_DELAY_MS = 300;

/** The measurements themselves, without the warm-up. */
const TEST_MINUTES = 20;

const TIPS = [
  'Test at the same time of day, ideally before a workout.',
  'Start the tests straight after the warm-up, while you are still warm.',
  'Move slowly into each position and stop at a firm stretch, never pain.',
  'Measure the same way each time so results are comparable.',
];

const AREA_LABELS = Object.fromEntries(SCORE_AREAS.map(({ id, label }) => [id, label]));

/**
 * The warm-up comes first, so every test starts from the same state. 'calculating' turns into
 * 'results' on its own, once the save is done and the minimum time is up.
 */
type Phase = 'intro' | 'warmup' | 'ready' | 'measuring' | 'calculating';

/** The warm-up's steps and countdowns, shortened by the dev switch for fast workouts. */
function warmupPlan() {
  const fast = getFastWorkouts();
  return {
    steps: fast ? TEST_WARMUP.map((step) => ({ ...step, durationSeconds: FAST_STEP_SECONDS })) : TEST_WARMUP,
    bufferMs: (fast ? FAST_BUFFER_SECONDS : WARMUP_BUFFER_SECONDS) * 1000,
    sideSwitchBufferMs: (fast ? FAST_BUFFER_SECONDS : WARMUP_SIDE_SWITCH_SECONDS) * 1000,
  };
}

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

  // Leaving after the warm-up wastes it, so Not now, the back button and swiping back all confirm first.
  const confirmSkipTest = () =>
    showDialog({
      title: 'Skip the test?',
      message: "You'll need to warm up again next time.",
      cancelLabel: 'Stay',
      confirm: { label: 'Skip test', onPress: () => setLeaving('cancel') },
    });

  // Mid-warm-up, leaving goes back to the intro; after it, it wastes the warm-up; mid-test it loses
  // the measurements; on the results screen it means "done". Before the warm-up there's nothing to lose.
  usePreventRemove(phase !== 'intro' && !leaving, () => {
    if (phase === 'ready') {
      confirmSkipTest();
    } else if (phase === 'warmup') {
      showDialog({
        title: 'Stop the warm-up?',
        message: "You'll need to warm up again before testing.",
        cancelLabel: 'Keep going',
        confirm: { label: 'Stop warm-up', onPress: () => setPhase('intro') },
      });
    } else if (phase === 'measuring') {
      showDialog({
        title: 'Stop the test?',
        message: "Your measurements won't be saved.",
        cancelLabel: 'Keep going',
        confirm: { label: 'Stop test', onPress: () => setLeaving('cancel') },
      });
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
          // The warm-up player has its own back button in place of the header.
          headerShown: !fullScreen && phase !== 'warmup',
          gestureEnabled: !fullScreen,
        }}
      />
      {phase === 'intro' && (
        <Intro
          onStart={() => setPhase('warmup')}
          // Dev only, along with skipping measurements, so the test can be clicked through quickly.
          onSkipWarmup={skipMeasurements ? () => setPhase('ready') : undefined}
        />
      )}
      {phase === 'warmup' && <Warmup onComplete={() => setPhase('ready')} />}
      {phase === 'ready' && <Ready onStart={() => setPhase('measuring')} onCancel={confirmSkipTest} />}
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

function Intro({ onStart, onSkipWarmup }: { onStart: () => void; onSkipWarmup?: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          eyebrow={`About ${WARMUP_MINUTES + TEST_MINUTES} minutes`}
          title="Flexibility test"
          subtitle={`A ${WARMUP_MINUTES}-minute warm-up, then ${FLEXIBILITY_TESTS.length} tests and ${TEST_STEPS.length} measurements.`}
        />
        <Card style={styles.introCard}>
          <CardTitle icon={{ ios: 'figure.walk', android: 'directions_walk' }} title="Warm-up first" />
          <ThemedText>
            Light movement raises your range for a while, so every test starts with the same short warm-up. That
            way your results compare fairly from one test to the next.
          </ThemedText>
        </Card>
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
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button title="Start warm-up" onPress={onStart} />
        {onSkipWarmup && <Button title="Skip warm-up" variant="secondary" onPress={onSkipWarmup} />}
      </View>
    </ThemedView>
  );
}

function Warmup({ onComplete }: { onComplete: () => void }) {
  // Read once: toggling fast mode mid-warm-up shouldn't change the running warm-up.
  const [plan] = useState(warmupPlan);

  return (
    <WorkoutPlayer
      {...plan}
      completeLabel="Finish warm-up"
      onComplete={onComplete}
      // Asks to stop the warm-up first, see the screen's prevent-remove.
      onBack={() => router.back()}
    />
  );
}

function Ready({ onStart, onCancel }: { onStart: () => void; onCancel: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.screen, styles.centeredScreen]}>
      <View style={styles.readyContent}>
        <Animated.View entering={ZoomIn.springify()}>
          <IconBadge name={{ ios: 'checkmark', android: 'check' }} size={88} />
        </Animated.View>
        <ThemedText type="title" accessibilityRole="header" style={styles.centeredText}>
          Warm-up done
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centeredText}>
          Start the test now, while you&apos;re still warm.
        </ThemedText>
      </View>
      <View style={[styles.footer, styles.readyFooter, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button title="Start test" onPress={onStart} />
        <Button title="Not now" variant="secondary" onPress={onCancel} />
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
  return <Pill kind="value" tone="accent" icon={{ ios: 'arrow.left.and.right', android: 'swap_horiz' }} label={label} />;
}

function Results({ saveFailed, onDone }: { saveFailed: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
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
            <View style={styles.change}>
              <ScoreChangePill change={overallChange} suffix=" since last test" />
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
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  progress: {
    paddingHorizontal: Spacing.screen,
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
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.two,
  },
  introCard: {
    gap: Spacing.three,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoAndHalf,
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
    gap: Spacing.twoAndHalf,
    paddingTop: Spacing.half,
  },
  tipText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  readyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.screen,
  },
  readyFooter: {
    alignSelf: 'stretch',
  },
  centeredText: {
    textAlign: 'center',
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
  },
});
