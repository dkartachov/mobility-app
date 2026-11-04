import { Slider } from '@expo/ui/community/slider';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { maxReadingGap } from '@/data/mobility-score';
import { METHOD_UNITS, UNIT_LABELS, type FlexibilityTest, type PhoneMethod } from '@/data/mobility-tests';
import { usePhoneMeasurement } from '@/hooks/use-phone-measurement';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { Card } from './card';
import { showDialog } from './dialog';
import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ProgressBar } from './progress-bar';
import { ThemedText } from './themed-text';

/**
 * Phone measurements are taken this many times and averaged, which roughly halves how much a
 * single slightly-off reading moves the score.
 */
export const PHONE_READINGS = 2;

type MeasurementProps = {
  test: FlexibilityTest;
  value: number | null;
  onChange: (value: number | null) => void;
};

// Every test's card is the same height, phone or slider, so the screen doesn't jump between tests:
// the label always takes two lines, and the controls under the reading always take this much room.

/** Lines kept for what's measured, enough for the longest. Small text is 20 high. */
const LABEL_LINES = 2;

/** A progress bar (10), the gap below it (8) and an outlined button (56). */
const CONTROLS_HEIGHT = 74;

/** The measuring part of a test step: a phone sensor reading or a distance on a slider. */
export function TestMeasurement({ test, value, onChange }: MeasurementProps) {
  const { method } = test;
  return (
    <Card style={styles.card}>
      <View style={styles.labelRow}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label} numberOfLines={LABEL_LINES}>
          {test.measurement}
        </ThemedText>
        {method.kind !== 'distance' && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="How measuring with the phone works"
            hitSlop={Spacing.two}
            onPress={() => showDialog(phoneInstructions(method))}>
            <Icon name={{ ios: 'info.circle', android: 'info' }} color="textSecondary" size={20} />
          </PressableScale>
        )}
      </View>
      {method.kind === 'distance' ? (
        <ValueSlider
          value={value}
          onChange={onChange}
          min={method.min}
          max={method.max}
          step={method.step}
          unit={UNIT_LABELS.cm}
          label={test.measurement}
        />
      ) : (
        <PhoneMeasurement
          method={method}
          value={value}
          onChange={onChange}
          label={test.measurement}
          maxGap={maxReadingGap(test)}
        />
      )}
    </Card>
  );
}

/** The steps of a phone measurement, behind the card's info button for anyone who wants them. */
function phoneInstructions(method: PhoneMethod) {
  return {
    title: 'Measuring with the phone',
    message: [
      `1. Tap Start measuring, then get into the start position: ${method.startPosition.toLowerCase()}. Hold still until a tone plays.`,
      '2. Move into the stretch and hold still at your furthest point until a second tone saves the reading.',
      `3. Do it ${PHONE_READINGS} times and the readings are averaged. If they show in red, they're too far apart: check the phone hasn't slipped and measure again.`,
      "It's hands-free: the tones and vibrations tell you when each step is done, so you don't need to look at the screen.",
    ].join('\n\n'),
  };
}

function PhoneMeasurement({
  method,
  value,
  onChange,
  label,
  maxGap,
}: {
  method: PhoneMethod;
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  /** Readings further apart than this aren't averaged without asking, see `maxReadingGap`. */
  maxGap: number;
}) {
  useKeepAwake();
  const ding = useAudioPlayer(require('@/assets/sounds/ding.wav'));
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
  }, []);
  const cue = (haptic: Haptics.NotificationFeedbackType) => {
    ding.seekTo(0).then(() => ding.play());
    Haptics.notificationAsync(haptic);
  };

  // Readings in the set being taken. The step's value only changes once a set is complete and its
  // readings agree (or are kept anyway), so taking a new set keeps the previous result until then.
  const [readings, setReadings] = useState<number[]>([]);
  const [keptAnyway, setKeptAnyway] = useState(false);
  const average = (rs: number[]) => rs.reduce((sum, r) => sum + r, 0) / rs.length;
  const gap = (rs: number[]) => Math.max(...rs) - Math.min(...rs);
  const { phase, angle, holdProgress, start, cancel } = usePhoneMeasurement(method, {
    onZeroed: () => cue(Haptics.NotificationFeedbackType.Warning),
    onResult: (result) => {
      const next = readings.length === PHONE_READINGS ? [result] : [...readings, result];
      const complete = next.length === PHONE_READINGS;
      const agree = !complete || gap(next) <= maxGap;
      cue(agree ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      setReadings(next);
      setKeptAnyway(false);
      if (complete && agree) onChange(average(next));
    },
  });
  const unit = UNIT_LABELS[METHOD_UNITS[method.kind]];

  if (phase === 'unavailable') {
    return (
      <>
        <ThemedText themeColor="textSecondary">
          Motion sensors aren&apos;t available, so set the angle yourself.
        </ThemedText>
        <ValueSlider value={value} onChange={onChange} min={0} max={180} unit={unit} label={label} />
      </>
    );
  }

  const active = phase === 'zeroing' || phase === 'measuring';
  // Part way through a set, between readings.
  const midSet = !active && readings.length > 0 && readings.length < PHONE_READINGS;
  const reading =
    phase === 'measuring' ? angle : phase === 'zeroing' ? null : midSet ? readings[readings.length - 1] : value;
  const finished = readings.length === PHONE_READINGS ? readings : null;
  // A finished set whose readings are too far apart to average without asking.
  const disagree = !active && finished !== null && gap(finished) > maxGap && !keptAnyway;
  // Readings too far apart show side by side in red, with the choice of what to do below them.
  const shown = disagree
    ? finished!.map((r) => `${r}${unit}`).join(' · ')
    : reading === null
      ? '—'
      : `${reading}${unit}`;

  // The same layout in every phase, only the contents change, so the box keeps its size when
  // measuring starts and ends. The steps are behind the card's info button rather than in here.
  return (
    <View style={styles.measure}>
      <ThemedText
        type="stat"
        style={styles.reading}
        themeColor={disagree ? 'danger' : reading === null ? 'textSecondary' : 'text'}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityLabel={
          disagree ? `${shown.replace(' · ', ' and ')}, too far apart to average. Measure again.` : undefined
        }>
        {shown}
      </ThemedText>
      <View style={styles.controls}>
        {/* Fills while holding still, to set the start position or save a reading. */}
        <View style={{ opacity: active && holdProgress > 0 ? 1 : 0 }}>
          <ProgressBar progress={holdProgress} />
        </View>
        {active ? (
          <Button title="Cancel" variant="secondary" onPress={cancel} />
        ) : disagree ? (
          // Side by side rather than stacked, so this choice doesn't make the card taller.
          <View style={styles.buttonRow}>
            <View style={styles.rowButton}>
              <Button title="Measure again" onPress={start} />
            </View>
            <View style={styles.rowButton}>
              <Button
                title="Use average"
                variant="secondary"
                onPress={() => {
                  setKeptAnyway(true);
                  onChange(average(finished!));
                }}
              />
            </View>
          </View>
        ) : midSet ? (
          <Button title={`Take reading ${readings.length + 1}`} onPress={start} />
        ) : (
          <Button
            title={value !== null ? 'Measure again' : 'Start measuring'}
            variant={value !== null ? 'secondary' : 'primary'}
            onPress={start}
          />
        )}
      </View>
    </View>
  );
}

/** Slider in steps of `step` units, whole units by default. Shows "—" until it's first moved, so an untouched step can't be saved by accident. */
function ValueSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  label,
}: {
  value: number | null;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit: string;
  label: string;
}) {
  const theme = useTheme();
  // Untouched, the thumb rests at 0 (the toes, for sit and reach) or the low end of the range.
  const initial = Math.min(max, Math.max(min, 0));

  return (
    <View style={styles.measure}>
      <ThemedText type="stat" style={styles.reading} themeColor={value === null ? 'textSecondary' : 'text'}>
        {value === null ? '—' : `${value} ${unit}`}
      </ThemedText>
      {/* The limits sit either side of the slider rather than under it, to fit the same room as the phone's controls. */}
      <View style={[styles.controls, styles.sliderRow]}>
        <ThemedText type="small" themeColor="textSecondary">
          {min} {unit}
        </ThemedText>
        <View style={styles.slider}>
          <Slider
            value={value ?? initial}
            minimumValue={min}
            maximumValue={max}
            step={step}
            onValueChange={(next) => onChange(Math.round(next / step) * step)}
            minimumTrackTintColor={theme.tint}
            maximumTrackTintColor={theme.backgroundSelected}
            thumbTintColor={theme.tint}
            accessibilityLabel={`${label}, in ${unit}`}
          />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {max} {unit}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    flex: 1,
    minHeight: LABEL_LINES * 20,
  },
  /** Tighter than a usual card, to leave the animation and instructions more of the screen. */
  card: {
    paddingVertical: Spacing.twoAndHalf,
    gap: Spacing.one,
  },
  measure: {
    gap: Spacing.one,
  },
  reading: {
    textAlign: 'center',
    fontSize: 48,
    lineHeight: 56,
  },
  /** At least the phone's controls' height, centered, so the slider's shorter controls take the same room. */
  controls: {
    minHeight: CONTROLS_HEIGHT,
    justifyContent: 'center',
    gap: Spacing.two,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rowButton: {
    flex: 1,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  slider: {
    flex: 1,
  },
});
