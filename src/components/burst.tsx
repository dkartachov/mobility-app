import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';

const DOTS = 16;
const DOT_SIZE = 14;

type BurstProps = {
  /** 0 before the burst, then animated to 1 to throw the dots out and fade them. */
  progress: SharedValue<number>;
  /** Size of what bursts, which the dots are centered on. */
  size: number;
  /** Taken in turn round the circle. */
  colors: string[];
  /** How far the dots fly, as a multiple of `size`. */
  reach?: number;
};

/** Dots thrown out from behind something as it lands, every other one further and larger. */
export function Burst({ progress, size, colors, reach = 0.85 }: BurstProps) {
  return (
    <View pointerEvents="none" style={[styles.stage, { width: size, height: size }]}>
      {Array.from({ length: DOTS }, (_, i) => (
        <BurstDot key={i} index={i} progress={progress} size={size} reach={reach} color={colors[i % colors.length]} />
      ))}
    </View>
  );
}

function BurstDot({
  index,
  progress,
  size,
  reach,
  color,
}: {
  index: number;
  progress: SharedValue<number>;
  size: number;
  reach: number;
  color: string;
}) {
  const angle = (index / DOTS) * 2 * Math.PI;
  const distance = size * (index % 2 === 0 ? reach : reach * 0.8);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 1 - progress.value,
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value },
      { scale: (index % 2 === 0 ? 1 : 0.6) * (1 - progress.value / 2) },
    ],
  }));

  return (
    <Animated.View
      style={[styles.dot, { left: size / 2 - DOT_SIZE / 2, top: size / 2 - DOT_SIZE / 2, backgroundColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'absolute',
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: Radius.full,
  },
});
