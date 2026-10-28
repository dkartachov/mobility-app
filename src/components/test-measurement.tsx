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

  if (phase === 'zeroing' || phase === 'measuring') {
    return (
      <View style={styles.phone}>
        <ThemedText type="stat" style={styles.reading} themeColor={phase === 'zeroing' ? 'textSecondary' : 'text'}>
          {phase === 'zeroing' ? '—' : `${angle}${unit}`}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.centered}>
          {phase === 'zeroing'
            ? `Get into the start position and hold still: ${method.startPosition.toLowerCase()}`
            : 'Move into the stretch, then hold still at your furthest point'}
        </ThemedText>
        {/* Always laid out, so the screen doesn't shift when holding still starts. */}
        <View style={[styles.hold, { opacity: holdProgress > 0 ? 1 : 0 }]}>
          <ProgressBar progress={holdProgress} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
            {phase === 'zeroing' ? 'Setting the start position…' : 'Hold still, saving…'}
          </ThemedText>
        </View>
        <Button title="Cancel" variant="secondary" onPress={cancel} />
      </View>
    );
  }

  return (
    <View style={styles.phone}>
      {value !== null ? (
        <ThemedText type="stat" style={styles.reading}>
          {value}
          {unit}
        </ThemedText>
      ) : (
        <ThemedText themeColor="textSecondary">
          Hands-free: a tone plays once the start position is set, and again when the result is saved.
        </ThemedText>
      )}
      <Button
        title={value !== null ? 'Measure again' : 'Start measuring'}
        variant={value !== null ? 'secondary' : 'primary'}
        onPress={start}
      />
    </View>
  );
}

/** Whole-unit slider. Shows "—" until it's first moved, so an untouched step can't be saved by accident. */
function ValueSlider({
  value,
  onChange,
  min,
  max,
  hint: hintOf,
  unit,
  label,
}: {
  value: number | null;
  onChange: (value: number) => void;
  min: number;
  max: number;
  hint?: (value: number) => string | undefined;
  unit: string;
  label: string;
}) {
  const theme = useTheme();
  // Untouched, the thumb rests at 0 (the floor, for forward fold) or the low end of the range.
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
        step={1}
        onValueChange={(next) => onChange(Math.round(next))}
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
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  reading: {
    textAlign: 'center',
    fontSize: 64,
    lineHeight: 72,
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
