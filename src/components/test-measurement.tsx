import { Slider } from '@expo/ui/community/slider';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import {
  METHOD_UNITS,
  UNIT_LABELS,
  type BodyMeasurements,
  type FlexibilityTest,
  type PhoneMethod,
} from '@/data/mobility-tests';
import { useProfile } from '@/db/profile';
import { usePhoneMeasurement } from '@/hooks/use-phone-measurement';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { Card } from './card';
import { ProgressBar } from './progress-bar';
import { ThemedText } from './themed-text';

/** Lines kept for the status under the reading, enough for the longest start position. */
const STATUS_LINES = 3;

/** Until the profile loads, hints fall back to average sizes. */
const NO_BODY: BodyMeasurements = { handLength: null, fingerLength: null, handSpan: null };

type MeasurementProps = {
  test: FlexibilityTest;
  value: number | null;
  onChange: (value: number | null) => void;
};

/** The measuring part of a test step: a phone sensor reading or a distance on a slider. */
export function TestMeasurement({ test, value, onChange }: MeasurementProps) {
  const { method } = test;
  const body = useProfile()?.body ?? NO_BODY;
  const hint = method.kind === 'distance' ? method.hint : undefined;
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
          hint={hint && ((v) => hint(v, body))}
          unit={UNIT_LABELS.cm}
          label={test.measurement}
        />
      ) : (
        <PhoneMeasurement method={method} value={value} onChange={onChange} label={test.measurement} />
      )}
    </Card>
  );
}

function PhoneMeasurement({
  method,
  value,
  onChange,
  label,
}: {
  method: PhoneMethod;
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
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

  const { phase, angle, holdProgress, start, cancel } = usePhoneMeasurement(method, {
    onZeroed: () => cue(Haptics.NotificationFeedbackType.Warning),
    onResult: (result) => {
      cue(Haptics.NotificationFeedbackType.Success);
      onChange(result);
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
  const reading = phase === 'measuring' ? angle : phase === 'zeroing' ? null : value;
  const status = {
    idle: 'Hands-free: a tone plays once the start position is set, and again when the result is saved.',
    zeroing: `Get into the start position and hold still: ${method.startPosition.toLowerCase()}`,
    measuring: 'Move into the stretch, then hold still at your furthest point',
    done: 'Saved. Measure again if it didn’t feel like your furthest point.',
  }[phase === 'idle' && value !== null ? 'done' : phase];

  // The same layout in every phase, only the contents change, so the box keeps its size when
  // measuring starts and ends.
  return (
    <View style={styles.phone}>
      <ThemedText type="stat" style={styles.reading} themeColor={reading === null ? 'textSecondary' : 'text'}>
        {reading === null ? '—' : `${reading}${unit}`}
      </ThemedText>
      <ThemedText
        type={active ? 'smallBold' : 'small'}
        themeColor={active ? 'text' : 'textSecondary'}
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
  hint: hintOf,
  unit,
  label,
}: {
  value: number | null;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  hint?: (value: number) => string | undefined;
  unit: string;
  label: string;
}) {
  const theme = useTheme();
  // Untouched, the thumb rests at 0 (the toes, for sit and reach) or the low end of the range.
  const initial = Math.min(max, Math.max(min, 0));
  const hint = value === null ? undefined : hintOf?.(value);

  return (
    <View style={styles.slider}>
      <ThemedText type="stat" style={styles.reading} themeColor={value === null ? 'textSecondary' : 'text'}>
        {value === null ? '—' : `${value} ${unit}`}
      </ThemedText>
      {hintOf && (
        // Always rendered, so the slider doesn't jump when the first hint appears.
        <ThemedText type="smallBold" themeColor="tint" style={styles.centered} accessibilityLiveRegion="polite">
          {hint ?? ' '}
        </ThemedText>
      )}
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
    gap: Spacing.two + Spacing.one,
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
