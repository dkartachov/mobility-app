import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  css,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { BadgeShape } from './milestone-badges';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const BADGE_SIZE = 200;
/** Whole turns, so the spin always ends with the badge flat and facing the front. */
const SPIN_TURNS = 5;
const SPIN_MS = 3000;
const BURST_DOTS = 16;
const BURST_MS = 900;
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

type MilestoneRevealProps = {
  hours: number;
  onDone: () => void;
};

/** Celebrates a milestone: its badge spins in like a coin, lands flat on its number and bursts. */
export function MilestoneReveal({ hours, onDone }: MilestoneRevealProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [landed, setLanded] = useState(false);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);
  const burst = useSharedValue(0);

  useEffect(() => {
    const land = () => {
      setLanded(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };
    scale.set(withSpring(1, { damping: 14, stiffness: 90 }));
    rotation.set(
      withTiming(SPIN_TURNS * 360, { duration: SPIN_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (!finished) return;
        scheduleOnRN(land);
        scale.set(withSequence(withTiming(1.12, { duration: 140 }), withSpring(1, { damping: 8, stiffness: 180 })));
        burst.set(withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) }));
      })
    );
  }, [burst, rotation, scale]);

  // Once landed, it can be dragged round, flung or tapped to spin again, always coming to rest flat.
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
    <ThemedView style={[styles.screen, { paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.springify()}>
          <ThemedText type="title" accessibilityRole="header" style={styles.centered}>
            Milestone reached!
          </ThemedText>
        </Animated.View>

        <View
          accessible
          accessibilityLabel={`${hours} ${hours === 1 ? 'hour' : 'hours'} milestone badge`}
          style={styles.stage}
          {...(landed ? spinner.panHandlers : {})}>
          {landed && <Animated.View style={[cssStyles.halo, { backgroundColor: theme.tint }]} />}
          {Array.from({ length: BURST_DOTS }, (_, i) => (
            <BurstDot key={i} index={i} progress={burst} color={theme.tint} />
          ))}
          <Animated.View style={badgeStyle}>
            <BadgeShape hours={hours} size={BADGE_SIZE} color={theme.tint} />
            <Animated.View style={[styles.layer, shadeStyle]}>
              <BadgeShape hours={hours} size={BADGE_SIZE} color="#000000" />
            </Animated.View>
            <Animated.View style={[styles.layer, styles.number, numberStyle]}>
              <ThemedText type="stat" themeColor="onTint" style={styles.numberText}>
                {hours}
              </ThemedText>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Reserves the line, so nothing moves when it appears. */}
        <View style={styles.caption}>
          {landed && (
            <Animated.View entering={FadeIn.duration(400)}>
              <ThemedText type="subtitle" themeColor="tint" style={styles.centered}>
                {hours} {hours === 1 ? 'hour' : 'hours'} of mobility time
              </ThemedText>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Reserves the button's space too. */}
      <View style={styles.done}>
        {landed && (
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Button title="Done" onPress={onDone} />
          </Animated.View>
        )}
      </View>
    </ThemedView>
  );
}

/** Thrown out from behind the badge as it lands, every other one further and larger. */
function BurstDot({ index, progress, color }: { index: number; progress: SharedValue<number>; color: string }) {
  const angle = (index / BURST_DOTS) * 2 * Math.PI;
  const distance = BADGE_SIZE * (index % 2 === 0 ? 0.85 : 0.68);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 1 - progress.value,
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value },
      { scale: (index % 2 === 0 ? 1 : 0.6) * (1 - progress.value / 2) },
    ],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: Spacing.three,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.six,
  },
  stage: {
    alignSelf: 'center',
    width: BADGE_SIZE,
    height: BADGE_SIZE,
  },
  layer: {
    ...StyleSheet.absoluteFill,
  },
  number: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 64,
    lineHeight: 72,
  },
  dot: {
    position: 'absolute',
    left: BADGE_SIZE / 2 - 7,
    top: BADGE_SIZE / 2 - 7,
    width: 14,
    height: 14,
    borderRadius: Radius.full,
  },
  caption: {
    minHeight: 26,
  },
  done: {
    minHeight: 56,
  },
  centered: {
    textAlign: 'center',
  },
});

/** Reanimated CSS animations, which React Native's `StyleSheet.create` doesn't type. */
const cssStyles = css.create({
  halo: {
    ...StyleSheet.absoluteFill,
    borderRadius: BADGE_SIZE / 2,
    animationName: {
      from: { opacity: 0.35, transform: [{ scale: 0.9 }] },
      to: { opacity: 0, transform: [{ scale: 1.45 }] },
    },
    animationDuration: '1.8s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-out',
  },
});
