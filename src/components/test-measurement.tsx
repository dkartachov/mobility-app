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
import { ProgressBar } from './progress-bar';
import { ThemedText } from './themed-text';

/** Lines kept for the status under the reading, enough for the longest start position. */
const STATUS_LINES = 3;

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

/** The measuring part of a test step: a phone sensor reading or a distance on a slider. */
export function TestMeasurement({ test, value, onChange }: MeasurementProps) {
  const { method } = test;
  return (
    <Card>
      <ThemedText type="small" themeColor="textSecondary">
        {test.measurement}
      </ThemedText>
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
  const status = {
    disagree: finished
      ? `${finished.map((r) => `${r}${unit}`).join(' and ')} are ${gap(finished)}${unit} apart, too far for the same stretch. Check the phone hasn’t slipped and measure again.`
      : '',
    idle: `Hands-free: a tone plays when the start position is set and when each of the ${PHONE_READINGS} readings is saved.`,
    zeroing: `Get into the start position and hold still: ${method.startPosition.toLowerCase()}`,
    measuring: 'Move into the stretch, then hold still at your furthest point',
    midSet: `Reading ${readings.length} of ${PHONE_READINGS} saved. Measure again the same way and they'll be averaged.`,
    done: finished
      ? `Saved the average of ${finished.map((r) => `${r}${unit}`).join(' and ')}. Measure again if either didn’t feel like your furthest point.`
      : 'Saved. Measure again if it didn’t feel like your furthest point.',
  }[disagree ? 'disagree' : midSet ? 'midSet' : phase === 'idle' && value !== null ? 'done' : phase];

  // The same layout in every phase, only the contents change, so the box keeps its size when
  // measuring starts and ends.
  return (
    <View style={styles.phone}>
      <ThemedText type="stat" style={styles.reading} themeColor={reading === null ? 'textSecondary' : 'text'}>
        {reading === null ? '—' : `${reading}${unit}`}
      </ThemedText>
      <ThemedText
        type={active || disagree ? 'smallBold' : 'small'}
        themeColor={disagree ? 'danger' : active ? 'text' : 'textSecondary'}
        style={[styles.centered, styles.status]}
        numberOfLines={STATUS_LINES}>
        {status}
      </ThemedText>
      <View style={[styles.hold, { opacity: active && holdProgress > 0 ? 1 : 0 }]}>
        <ProgressBar progress={holdProgress} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          {phase === 'zeroing' ? 'Setting the start position…' : 'Hold still, saving…'}
        </ThemedText>
      </View>
      {active ? (
        <Button title="Cancel" variant="secondary" onPress={cancel} />
      ) : disagree ? (
        <>
          <Button title="Measure again" onPress={start} />
          <Button
            title="Use the average anyway"
            variant="secondary"
            onPress={() => {
              setKeptAnyway(true);
              onChange(average(finished!));
            }}
          />
        </>
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
    <View style={styles.slider}>
      <ThemedText type="stat" style={styles.reading} themeColor={value === null ? 'textSecondary' : 'text'}>
        {value === null ? '—' : `${value} ${unit}`}
      </ThemedText>
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
      <View style={styles.sliderLimits}>
        <ThemedText type="small" themeColor="textSecondary">
          {min} {unit}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {max} {unit}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    gap: Spacing.twoAndHalf,
    paddingTop: Spacing.one,
  },
  reading: {
    textAlign: 'center',
    fontSize: 56,
    lineHeight: 64,
  },
  /** Room for the longest status, so a shorter one doesn't shrink the box. Small text is 20 high. */
  status: {
    height: STATUS_LINES * 20,
  },
  hold: {
    gap: Spacing.one,
  },
  centered: {
    textAlign: 'center',
  },
  slider: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  sliderLimits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
