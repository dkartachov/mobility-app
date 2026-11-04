import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import { milestoneProgress } from '@/lib/milestones';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const FILL_MS = 1200;

type MilestoneRingProps = {
  totalSeconds: number;
  /** Outer size, including the ring. */
  size: number;
  thickness?: number;
  /** Fills from empty the first time this turns true, e.g. once its screen is in view. */
  play: boolean;
  delayMs?: number;
  /** Drawn in the middle, e.g. an avatar. */
  children: ReactNode;
};

/** A thin ring round its content that fills clockwise from the top, towards the next milestone. */
export function MilestoneRing({ totalSeconds, size, thickness = 3, play, delayMs = 0, children }: MilestoneRingProps) {
  const theme = useTheme();
  const { nextHours, progress: target } = milestoneProgress(totalSeconds);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!play) return;
    progress.set(withDelay(delayMs, withTiming(target, { duration: FILL_MS, easing: Easing.out(Easing.cubic) })));
    // The delay is for the first fill; after that only the progress restarts it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, target]);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
    // A round cap draws a dot even at 0, so the arc hides until there's something to show.
    strokeOpacity: progress.get() > 0.001 ? 1 : 0,
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={nextHours === null ? 'Every milestone reached' : `Progress to the ${nextHours} hour milestone`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}
      style={[styles.ring, { width: size, height: size }]}>
      {/* Turned back a quarter so the arc starts at the top. */}
      <Svg width={size} height={size} style={styles.svg}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.backgroundSelected} strokeWidth={thickness} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.tint}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          fill="none"
          animatedProps={arcProps}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    ...StyleSheet.absoluteFill,
    transform: [{ rotate: '-90deg' }],
  },
});
