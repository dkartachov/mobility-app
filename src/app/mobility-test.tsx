import { Slider } from '@expo/ui/community/slider';
import { Stack, router, usePreventRemove } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  BODY_PART_LABELS,
  FLEXIBILITY_TESTS,
  SIDE_LABELS,
  TEST_STEPS,
  type BodyPart,
} from '@/data/mobility-tests';
import { logMobilityTest } from '@/db/mobility-tests';
import { useTheme } from '@/hooks/use-theme';

/** Placeholder until the score is actually calculated. */
const CALCULATING_MS = 2000;

const SLIDER_START = 0.5;

const TIPS = [
  'Test at the same time of day, ideally before climbing or training rather than after.',
  'Use the same place, wall and floor surface each time.',
  'Do the same warm-up every time, or none at all.',
  'Test barefoot in clothes that don’t restrict movement.',
  'Move slowly into each position and stop at a firm stretch, never pain.',
  'Measure the same way each time so results are comparable.',
];

const BODY_PARTS = [...new Set(FLEXIBILITY_TESTS.map((test) => test.bodyPart))] as BodyPart[];

type Phase = 'intro' | 'measuring' | 'calculating' | 'results';

export default function MobilityTestScreen() {
  const db = useSQLiteContext();
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState(() => TEST_STEPS.map(() => SLIDER_START));
  const [leaving, setLeaving] = useState<'cancel' | 'done'>();

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
      TEST_STEPS.map(({ test, side }, i) => ({ exerciseId: test.id, side, value: values[i] }))
    ).catch(console.error);
  };

  const next = () => {
    if (index < TEST_STEPS.length - 1) setIndex(index + 1);
    else finish();
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
        />
      )}
      {phase === 'calculating' && <Calculating />}
      {phase === 'results' && <Results onDone={() => setLeaving('done')} />}
    </>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" accessibilityRole="header">
          Flexibility test
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {FLEXIBILITY_TESTS.length} tests, {TEST_STEPS.length} measurements in total. Two-sided tests are done
          left, then right. It takes about 15 minutes.
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
          <ThemedText>A clear wall, some floor space and a table.</ThemedText>
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
  value: number;
  onChange: (value: number) => void;
  onBack?: () => void;
  onNext: () => void;
};

function Measure({ index, value, onChange, onBack, onNext }: MeasureProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { test, side } = TEST_STEPS[index];
  const last = index === TEST_STEPS.length - 1;

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.progress}>
        <ProgressBar progress={(index + 1) / TEST_STEPS.length} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <ThemedText type="small" themeColor="textSecondary">
            {BODY_PART_LABELS[test.bodyPart]}
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
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {test.measurement}
          </ThemedText>
          <Slider
            value={value}
            onValueChange={onChange}
            minimumTrackTintColor={theme.tint}
            maximumTrackTintColor={theme.backgroundSelected}
            thumbTintColor={theme.tint}
            accessibilityLabel={test.measurement}
            style={styles.slider}
          />
        </Card>
      </ScrollView>
      <View style={[styles.footer, styles.footerRow, { paddingBottom: insets.bottom + Spacing.three }]}>
        {onBack && (
          <View style={styles.footerButton}>
            <Button title="Back" variant="secondary" onPress={onBack} />
          </View>
        )}
        <View style={styles.footerButton}>
          <Button title={last ? 'Finish' : 'Next'} onPress={onNext} />
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
          <ThemedText type="smallBold">Improvement by body part</ThemedText>
          {BODY_PARTS.map((part) => (
            <View key={part} style={styles.partRow}>
              <ThemedText>{BODY_PART_LABELS[part]}</ThemedText>
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
  slider: {
    marginVertical: Spacing.two,
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
