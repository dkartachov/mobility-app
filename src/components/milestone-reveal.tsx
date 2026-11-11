import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  css,
  Easing,
  FadeIn,
  FadeInDown,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Spacing } from '@/constants/theme';
import { useSoundEffect } from '@/hooks/use-sound-effect';
import { badgeLook } from '@/lib/badge-looks';

import { BadgeCoin, useBadgeSpin } from './badge-coin';
import { Burst } from './burst';
import { Button } from './button';
import { BadgeAura } from './milestone-badges';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const BADGE_SIZE = 200;
/** Whole turns, so the spin always ends with the badge flat and facing the front. */
const SPIN_TURNS = 5;
const SPIN_MS = 3000;
const BURST_MS = 900;

type MilestoneRevealProps = {
  hours: number;
  onDone: () => void;
};

/** Celebrates a milestone: its badge spins in like a coin, lands flat on its number and bursts. */
export function MilestoneReveal({ hours, onDone }: MilestoneRevealProps) {
  const look = badgeLook(hours);
  const insets = useSafeAreaInsets();
  const [landed, setLanded] = useState(false);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);
  const burst = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  // The spin builds up to the landing's chime. They're separate sounds so the chime still lands on
  // time when the spin is cut short, as it is with reduced motion.
  const spinSound = useSoundEffect(require('@/assets/sounds/milestone-spin.wav'));
  const chime = useSoundEffect(require('@/assets/sounds/milestone.wav'));

  useEffect(() => {
    const land = () => {
      setLanded(true);
      spinSound.stop();
      chime.play();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };
    spinSound.play();
    scale.set(withSpring(1, { damping: 14, stiffness: 90 }));
    rotation.set(
      withTiming(SPIN_TURNS * 360, { duration: SPIN_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (!finished) return;
        scheduleOnRN(land);
        scale.set(withSequence(withTiming(1.12, { duration: 140 }), withSpring(1, { damping: 8, stiffness: 180 })));
        burst.set(withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) }));
      })
    );
  }, [burst, chime, rotation, scale, spinSound]);

  // Once landed, it can be dragged round, flung or tapped to spin again.
  const spinner = useBadgeSpin(rotation, scale);

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
          {/* A CSS animation, which doesn't follow the reduce motion setting by itself. */}
          {landed && !reducedMotion && <Animated.View style={[cssStyles.halo, { backgroundColor: look.accent }]} />}
          {landed && <BadgeAura hours={hours} size={BADGE_SIZE} />}
          <Burst progress={burst} size={BADGE_SIZE} colors={[look.accent]} />
          <BadgeCoin hours={hours} size={BADGE_SIZE} rotation={rotation} scale={scale} />
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
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
