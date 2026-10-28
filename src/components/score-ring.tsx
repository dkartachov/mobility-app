import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { SCORE_COLOR_STOPS, SCORE_COLORS } from '@/data/mobility-score';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const FILL_MS = 1500;
const COLORS = [...SCORE_COLORS];

type ScoreRingProps = {
  /** 0–100, or `null` for no score yet (an empty ring with a dash). */
  score: number | null;
  /** Shown under the number. */
  label?: string;
  size?: number;
  thickness?: number;
  delayMs?: number;
};

/**
 * A ring that fills clockwise from the top up to `score`, counting the number up in the middle.
 * Its color follows the score from red through yellow to green. Animates on mount and again
 * from where it is whenever the score changes.
 */
export function ScoreRing({ score, label, size = 168, thickness = 14, delayMs = 0 }: ScoreRingProps) {
  const theme = useTheme();
  const target = score === null ? 0 : Math.min(100, Math.max(0, score));
  const progress = useSharedValue(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    progress.set(
      withDelay(delayMs, withTiming(target / 100, { duration: FILL_MS, easing: Easing.out(Easing.cubic) }))
    );
    // Only the score restarts it; the delay is for the first fill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useAnimatedReaction(
    () => Math.round(progress.get() * 100),
    (next, previous) => {
      if (next !== previous) scheduleOnRN(setShown, next);
    }
  );

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
    stroke: interpolateColor(progress.get(), SCORE_COLOR_STOPS, COLORS),
    // A round cap draws a dot even at 0, so the arc hides until there's something to show.
    strokeOpacity: progress.get() > 0.001 ? 1 : 0,
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Score'}
      accessibilityValue={score === null ? undefined : { min: 0, max: 100, now: Math.round(target) }}
      style={{ width: size, height: size }}>
      {/* Turned back a quarter so the arc starts at the top. */}
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.backgroundSelected}
          strokeWidth={thickness}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          fill="none"
          animatedProps={arcProps}
        />
      </Svg>
      <View style={styles.center}>
        <ThemedText type="stat" themeColor={score === null ? 'textSecondary' : 'text'}>
          {score === null ? '—' : shown}
        </ThemedText>
        {label && (
          <ThemedText type="small" themeColor="textSecondary">
            {label}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
