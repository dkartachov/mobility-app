import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

type TimerBarProps = {
  totalMs: number;
  remainingMs: number;
  running: boolean;
  /** Changes whenever a new countdown starts (next step, reset), jumping the bar to its start. */
  countdown: number;
};

/**
 * Countdown progress that fills smoothly on the UI thread instead of stepping with each timer
 * tick. Only the start, pause and resume of a countdown are synced from JS.
 */
export function TimerBar({ totalMs, remainingMs, running, countdown }: TimerBarProps) {
  const theme = useTheme();
  const progress = useSharedValue(1 - remainingMs / totalMs);

  // remainingMs changes on every tick, so these only re-sync when a countdown starts, stops or resumes.
  useEffect(() => {
    progress.set(1 - remainingMs / totalMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  useEffect(() => {
    if (!running) {
      cancelAnimation(progress);
      if (remainingMs <= 0) progress.set(1);
      return;
    }
    progress.set(withTiming(1, { duration: remainingMs, easing: Easing.linear }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, countdown]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(1, Math.max(0, progress.value)) * 100}%`,
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round((1 - remainingMs / totalMs) * 100) }}
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <Animated.View style={[styles.fill, { backgroundColor: theme.tint }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
