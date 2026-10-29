import { Stack, router, usePreventRemove } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { TestMeasurement } from '@/components/test-measurement';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SCORE_AREAS } from '@/data/mobility-score';
import {
  BODY_MEASUREMENT_LABELS,
  DEFAULT_BODY,
  FLEXIBILITY_TESTS,
  METHOD_UNITS,
  SIDE_LABELS,
  TEST_STEPS,
} from '@/data/mobility-tests';
import { logMobilityTest } from '@/db/mobility-tests';
import { useProfile } from '@/db/profile';
import { useTheme } from '@/hooks/use-theme';
import { useSkipTestMeasurements } from '@/lib/dev-settings';

/** Placeholder until the score is actually calculated. */
const CALCULATING_MS = 2000;

const TIPS = [
  'Test at the same time of day, ideally before climbing or training rather than after.',
  'Use the same place, wall and floor surface each time.',
  'Do the same warm-up every time, or none at all.',
  'Test barefoot in clothes that don’t restrict movement.',
  'Move slowly into each position and stop at a firm stretch, never pain.',
  'Measure the same way each time so results are comparable.',
];

const BODY_MEASUREMENT_KEYS = Object.keys(BODY_MEASUREMENT_LABELS) as (keyof typeof BODY_MEASUREMENT_LABELS)[];

const AREA_LABELS = Object.fromEntries(SCORE_AREAS.map(({ id, label }) => [id, label]));

type Phase = 'intro' | 'measuring' | 'calculating' | 'results';

export default function MobilityTestScreen() {
  const db = useSQLiteContext();
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<(number | null)[]>(() => TEST_STEPS.map(() => null));
  const [leaving, setLeaving] = useState<'cancel' | 'done'>();
  const skipMeasurements = useSkipTestMeasurements();

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
    if (phase !== 'calculating') return;
    const id = setTimeout(() => setPhase('results'), CALCULATING_MS);
    return () => clearTimeout(id);
  }, [phase]);

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
    ).catch(console.error);
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
      {phase === 'results' && <Results onDone={() => setLeaving('done')} />}
    </>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  const insets = useSafeAreaInsets();
  const profile = useProfile();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" accessibilityRole="header">
          Flexibility test
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {FLEXIBILITY_TESTS.length} tests, {TEST_STEPS.length} measurements in total. Two-sided tests are done
          left, then right. It takes about 20 minutes.
        </ThemedText>
        <Card>
          <ThemedText type="smallBold">For accurate results</ThemedText>
          {TIPS.map((tip) => (
            <View key={tip} style={styles.tip}>
              <ThemedText themeColor="tint">•</ThemedText>
              <ThemedText style={styles.tipText}>{tip}</ThemedText>
            </View>
          ))}
        </Card>
        <Card>
          <ThemedText type="smallBold">You&apos;ll need</ThemedText>
          <ThemedText>A clear wall, some floor space, a table and a tape measure.</ThemedText>
        </Card>
        <Card>
          <ThemedText type="smallBold">Your body measurements</ThemedText>
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <ThemedText type="small" themeColor="textSecondary">
            {AREA_LABELS[test.area]}
          </ThemedText>
          <ThemedText type="title" accessibilityRole="header">
            {test.name}
          </ThemedText>
          {side && (
            <ThemedText type="subtitle" themeColor="tint">
              {SIDE_LABELS[side]}
            </ThemedText>
          )}
        </View>
        <ThemedText>{test.instructions}</ThemedText>
        <TestMeasurement test={test} value={value} onChange={onChange} />
      </ScrollView>
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
      <ActivityIndicator size="large" color={theme.tint} />
      <ThemedText type="subtitle">Calculating mobility score…</ThemedText>
    </ThemedView>
  );
}

function Results({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeIn} style={styles.resultsHeader}>
          <ThemedText type="small" themeColor="textSecondary">
            Mobility score
          </ThemedText>
          <ThemedText type="stat" themeColor="textSecondary" style={styles.score}>
            —
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Scoring coming soon. Your measurements are saved.
          </ThemedText>
        </Animated.View>
        <Card>
          <ThemedText type="smallBold">Improvement by area</ThemedText>
          {SCORE_AREAS.map(({ id, label }) => (
            <View key={id} style={styles.partRow}>
              <ThemedText>{label}</ThemedText>
              <ThemedText themeColor="textSecondary">—</ThemedText>
            </View>
          ))}
        </Card>
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
    gap: Spacing.half,
  },
  tip: {
    flexDirection: 'row',
    gap: Spacing.two,
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
  score: {
    fontSize: 64,
    lineHeight: 72,
  },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
