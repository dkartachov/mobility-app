import { useState } from 'react';
import { PanResponder, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { badgeLook } from '@/lib/badge-looks';

import { BadgeShape } from './milestone-badges';
import { ThemedText } from './themed-text';

/** How far the badge turns per point dragged across it. */
const DEGREES_PER_POINT = 0.8;
/** Faster flings would strobe rather than read as spinning. */
const MAX_SPIN_SPEED = 3600;
/** Slower than this, letting go just settles it back flat. */
const MIN_SPIN_SPEED = 200;
/** What a tap gives it, in degrees per second. */
const TAP_SPIN_SPEED = 1440;
/** Roughly how long a fling coasts, in seconds, before it's rounded to land flat. */
const COAST_S = 1;

type BadgeCoinProps = {
  hours: number;
  size: number;
  /** Degrees turned round its upright axis; a whole number of turns faces the front. */
  rotation: SharedValue<number>;
  scale: SharedValue<number>;
};

/** A milestone's badge drawn like a coin, turning in 3D with `rotation`. */
export function BadgeCoin({ hours, size, rotation, scale }: BadgeCoinProps) {
  const look = badgeLook(hours);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateY: `${rotation.value}deg` }, { scale: scale.value }],
  }));
  // Mirrored from behind, so the number only shows on the front. The shape looks the same either way.
  const numberStyle = useAnimatedStyle(() => ({
    opacity: Math.cos((rotation.value * Math.PI) / 180) > 0 ? 1 : 0,
  }));
  // Darkens as the badge turns away from the light, which is what makes it read as turning in 3D.
  const shadeStyle = useAnimatedStyle(() => ({
    opacity: Math.abs(Math.sin((rotation.value * Math.PI) / 180)) * 0.35,
  }));

  return (
    <Animated.View style={badgeStyle}>
      <BadgeShape hours={hours} size={size} />
      <Animated.View style={[styles.layer, shadeStyle]}>
        <BadgeShape hours={hours} size={size} color="#000000" />
      </Animated.View>
      <Animated.View style={[styles.layer, styles.number, numberStyle]}>
        <ThemedText type="stat" style={{ color: look.text, fontSize: size * 0.32, lineHeight: size * 0.36 }}>
          {hours}
        </ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Touch handlers that let a badge be dragged round, flung or tapped to spin, always coming to
 * rest flat on its front.
 */
export function useBadgeSpin(rotation: SharedValue<number>, scale: SharedValue<number>) {
  const [spinner] = useState(() => {
    let startRotation = 0;
    const release = (speed: number) => {
      scale.set(withSpring(1, { damping: 8, stiffness: 180 }));
      const current = rotation.get();
      const clamped = Math.max(-MAX_SPIN_SPEED, Math.min(MAX_SPIN_SPEED, speed));
      if (Math.abs(clamped) < MIN_SPIN_SPEED) {
        rotation.set(withSpring(Math.round(current / 360) * 360, { damping: 12, stiffness: 120 }));
        return;
      }
      // An ease-out starts at three times its average speed, so this duration carries on at the fling's.
      const coasted = (current + clamped * COAST_S) / 360;
      const target = (clamped > 0 ? Math.ceil(coasted) : Math.floor(coasted)) * 360;
      const duration = ((3 * Math.abs(target - current)) / Math.abs(clamped)) * 1000;
      rotation.set(withTiming(target, { duration, easing: Easing.out(Easing.cubic) }));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        cancelAnimation(rotation);
        startRotation = rotation.get();
        scale.set(withSpring(0.94, { damping: 15, stiffness: 300 }));
      },
      onPanResponderMove: (_, { dx }) => rotation.set(startRotation + dx * DEGREES_PER_POINT),
      onPanResponderRelease: (_, { dx, vx }) =>
        release(Math.abs(dx) < 4 ? TAP_SPIN_SPEED : vx * 1000 * DEGREES_PER_POINT),
      onPanResponderTerminate: () => release(0),
    });
  });
  return spinner;
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
  },
  number: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
