import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Button } from '@/components/button';
import { IconBadge } from '@/components/icon-badge';
import { BackButton, HEADER_HEIGHT } from '@/components/stack-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Building takes a few milliseconds, so the bar takes this much longer and doesn't just flash. */
export const BUILD_MS = 1000;

const BADGE_SIZE = 96;
/** The full bar and "Building your routine" fade out for this long, before the check mark pops in. */
const FADE_OUT_MS = 250;
const FADE_IN_MS = 300;
/** After the check mark pops in, the button comes up. */
const BUTTON_DELAY_MS = FADE_OUT_MS + 350;

// Every step runs even with reduce motion on, which would otherwise skip straight to the end and
// make the screen just snap from the bar to the button. They're short, and the bar shows progress.
const timing = (duration: number) => ({ duration, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never });
const POP = { damping: 12, stiffness: 220, mass: 0.7, reduceMotion: ReduceMotion.Never };

type RoutinePrepProps = {
  /** E.g. "Focus · 15 min". */
  title: string;
  /** False while the routine is still being built. */
  built: boolean;
  onStart: () => void;
  onBack: () => void;
};

/**
 * Between picking a length and the workout: a bar fills while the routine is built, then fades out
 * and a check mark pops in, followed by a button that starts it. Everything stays mounted and is
 * animated by hand, so each step plays in order instead of relying on enter and exit animations.
 */
export function RoutinePrep({ title, built, onStart, onBack }: RoutinePrepProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const progress = useSharedValue(0);
  // 0 while building, 1 once ready: drives the fade out of the bar and the first title.
  const done = useSharedValue(0);
  const badge = useSharedValue(0);
  const button = useSharedValue(0);

  useEffect(() => {
    if (!built) return;
    progress.set(
      withTiming(1, { ...timing(BUILD_MS), easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(setReady, true);
      })
    );
  }, [built, progress]);

  useEffect(() => {
    if (!ready) return;
    AccessibilityInfo.announceForAccessibility('Your routine is ready');
    done.set(withTiming(1, timing(FADE_OUT_MS)));
    badge.set(withDelay(FADE_OUT_MS, withSpring(1, POP)));
    button.set(withDelay(BUTTON_DELAY_MS, withTiming(1, timing(FADE_IN_MS))));
  }, [ready, done, badge, button]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  const buildingStyle = useAnimatedStyle(() => ({ opacity: 1 - done.get() }));
  const readyTitleStyle = useAnimatedStyle(() => ({ opacity: badge.get() > 0 ? Math.min(1, badge.get()) : 0 }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, badge.get() * 2),
    transform: [{ scale: 0.4 + 0.6 * badge.get() }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: button.get(),
    transform: [{ translateY: 16 * (1 - button.get()) }],
  }));

  return (
    <ThemedView style={[styles.screen, { paddingBottom: insets.bottom + Spacing.three }]}>
      {/* In place of the stack header, which the workout screen hides. */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <BackButton onPress={onBack} />
      </View>

      <View style={styles.content}>
        <ThemedText type="eyebrow" themeColor="tint" style={styles.centered}>
          {title}
        </ThemedText>
        {/* The two titles sit on top of each other and cross-fade. */}
        <View>
          <Animated.View style={buildingStyle} importantForAccessibility={ready ? 'no-hide-descendants' : 'auto'}>
            <ThemedText type="title" accessibilityRole="header" style={styles.centered}>
              Building your routine
            </ThemedText>
          </Animated.View>
          <Animated.View
            style={[StyleSheet.absoluteFill, readyTitleStyle]}
            importantForAccessibility={ready ? 'auto' : 'no-hide-descendants'}>
            <ThemedText type="title" accessibilityRole="header" style={styles.centered}>
              Your routine is ready!
            </ThemedText>
          </Animated.View>
        </View>
        {/* The bar and the check mark share one fixed-height slot, so nothing shifts when they swap. */}
        <View style={styles.slot}>
          <Animated.View
            accessibilityRole="progressbar"
            accessibilityLabel="Building your routine"
            style={[styles.track, { backgroundColor: theme.backgroundSelected }, buildingStyle]}>
            <Animated.View style={[styles.fill, { backgroundColor: theme.tint }, fillStyle]} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.badge, badgeStyle]}>
            <IconBadge name={{ ios: 'checkmark', android: 'check' }} size={BADGE_SIZE} />
          </Animated.View>
        </View>
      </View>

      <Animated.View style={[styles.footer, buttonStyle]} pointerEvents={ready ? 'auto' : 'none'}>
        <Button title="Start routine" onPress={onStart} disabled={!ready} />
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    justifyContent: 'center',
    minHeight: HEADER_HEIGHT,
    paddingHorizontal: Spacing.screen,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.screen,
    gap: Spacing.three,
    // Sits a little above the middle, which looks centred with the back button above.
    paddingBottom: HEADER_HEIGHT,
  },
  slot: {
    height: BADGE_SIZE * 1.6,
    justifyContent: 'center',
  },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  badge: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.screen,
  },
  centered: {
    textAlign: 'center',
  },
});
