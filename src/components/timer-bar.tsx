import { useEffect, useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Countdown = {
  totalMs: number;
  remainingMs: number;
  running: boolean;
  /** Changes whenever a new countdown starts (next step, reset), jumping the progress to its start. */
  countdown: number;
};

/**
 * 0–1 progress through a countdown, moving smoothly on the UI thread instead of stepping with each
 * timer tick. Only the start, pause and resume of a countdown are synced from JS.
 */
export function useCountdownProgress({ totalMs, remainingMs, running, countdown }: Countdown) {
  const progress = useSharedValue(1 - remainingMs / totalMs);

  // remainingMs changes on every tick, so these only re-sync when a countdown starts, stops or resumes.
  // Before paint, so a new countdown never shows a frame of the last one's progress.
  useLayoutEffect(() => {
    progress.set(1 - remainingMs / totalMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  useEffect(() => {
    if (!running) {
      cancelAnimation(progress);
      if (remainingMs <= 0) progress.set(1);
      return;
    }
    // Shows time passing rather than decorating, so it runs even with reduce motion on, which
    // would otherwise jump it straight to the end.
    progress.set(withTiming(1, { duration: remainingMs, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, countdown]);

  return progress;
}

type TimerBarProps = Countdown & {
  /** The fill's color, e.g. muted for the get-ready countdown. */
  color?: ThemeColor;
};

export function TimerBar({ color = 'tint', ...countdown }: TimerBarProps) {
  const theme = useTheme();
  const progress = useCountdownProgress(countdown);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(1, Math.max(0, progress.value)) * 100}%`,
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round((1 - countdown.remainingMs / countdown.totalMs) * 100),
      }}
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <Animated.View style={[styles.fill, { backgroundColor: theme[color] }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
