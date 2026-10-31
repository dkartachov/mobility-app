import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { milestoneProgress } from '@/lib/milestones';

import { ThemedText } from './themed-text';

type MilestoneBarProps = {
  totalSeconds: number;
  /**
   * When set, the bar animates from this total up to `totalSeconds` on mount, and from where it is
   * whenever `totalSeconds` changes. If that crosses a milestone, the bar fills up, resets and keeps
   * going towards the following one.
   */
  animateFromSeconds?: number;
  durationMs?: number;
  delayMs?: number;
  onAnimationEnd?: () => void;
};

/** Progress towards the next lifetime milestone, with a "Next milestone" label underneath. */
export function MilestoneBar({
  totalSeconds,
  animateFromSeconds,
  durationMs = 1500,
  delayMs = 0,
  onAnimationEnd,
}: MilestoneBarProps) {
  const theme = useTheme();
  const initialSeconds = animateFromSeconds ?? totalSeconds;
  const animated = animateFromSeconds !== undefined;
  const seconds = useSharedValue(initialSeconds);
  const [nextHours, setNextHours] = useState(() => milestoneProgress(initialSeconds).nextHours);

  useEffect(() => {
    if (!animated) seconds.set(totalSeconds);
  }, [animated, seconds, totalSeconds]);

  // Only the total restarts it; the delay is for the first fill.
  useEffect(() => {
    if (!animated) return;
    seconds.set(
      withDelay(
        delayMs,
        withTiming(totalSeconds, { duration: durationMs, easing: Easing.inOut(Easing.cubic) }, (finished) => {
          if (finished && onAnimationEnd) scheduleOnRN(onAnimationEnd);
        })
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSeconds]);

  useAnimatedReaction(
    () => milestoneProgress(seconds.value).nextHours,
    (next, previous) => {
      if (next !== previous) scheduleOnRN(setNextHours, next);
    }
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: `${milestoneProgress(seconds.value).progress * 100}%`,
  }));

  const finalProgress = milestoneProgress(totalSeconds).progress;

  return (
    <View style={styles.container}>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(finalProgress * 100) }}
        style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <Animated.View style={[styles.fill, { backgroundColor: theme.tint }, fillStyle]} />
      </View>
      <View style={styles.label}>
        {nextHours === null ? (
          <ThemedText type="small" themeColor="textSecondary">
            All milestones reached
          </ThemedText>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Next milestone
            </ThemedText>
            <ThemedText type="smallBold" themeColor="tint">
              {nextHours}h
            </ThemedText>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  label: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.two,
  },
});
