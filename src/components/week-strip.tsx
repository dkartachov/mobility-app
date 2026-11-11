import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { useSoundEffect } from '@/hooks/use-sound-effect';
import { useTheme } from '@/hooks/use-theme';
import { fromDateKey, todayKey, type DateKey } from '@/lib/dates';

import { Icon } from './icon';
import { ThemedText } from './themed-text';

const DOT = 28;
const SPARKLES = 12;
const SPARKLE_SIZE = 6;
/** How far the sparkles fly from the dot's centre. */
const SPARKLE_REACH = DOT * 1.6;
const BURST_MS = 1000;

type WeekStripProps = {
  days: { date: DateKey; trained: boolean }[];
  /**
   * A celebration on today's dot: `pending` keeps it empty, and `play` fills it in with the
   * celebration after `delayMs`.
   */
  celebration?: Celebration;
  delayMs?: number;
};

type Celebration = 'pending' | 'play';

/** One dot per day, filled with a check on trained days. Today gets a ring until it's trained. */
export function WeekStrip({ days, celebration, delayMs = 0 }: WeekStripProps) {
  const theme = useTheme();
  const today = todayKey();

  return (
    <View style={styles.row}>
      {days.map(({ date, trained }) => {
        const day = fromDateKey(date);
        const isToday = date === today;
        return (
          <View
            key={date}
            accessible
            accessibilityLabel={`${day.toLocaleDateString(undefined, { weekday: 'long' })}: ${trained ? 'trained' : 'rest'}`}
            style={styles.day}>
            <ThemedText type="eyebrow" themeColor={isToday ? 'text' : 'textSecondary'}>
              {day.toLocaleDateString(undefined, { weekday: 'narrow' })}
            </ThemedText>
            {isToday && trained ? (
              <TodayDot celebration={celebration} delayMs={delayMs} />
            ) : (
              <View
                style={[
                  styles.dot,
                  { backgroundColor: trained ? theme.trained : theme.backgroundSelected },
                  isToday && { borderWidth: 2, borderColor: theme.trained, borderStyle: 'dashed' },
                ]}>
                {trained && <Icon name={{ ios: 'checkmark', android: 'check' }} size={16} color="onTint" />}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Today's trained dot. When celebrating, it pops in past full size, sends two rings rippling out,
 * bursts into sparkles and briefly glows, then settles to look like any other trained day.
 * Reanimated skips straight to the end when the phone asks for reduced motion.
 */
function TodayDot({ celebration, delayMs }: { celebration?: Celebration; delayMs: number }) {
  const theme = useTheme();
  const celebrate = celebration === 'play';
  // Each settles at 1; starting at 0 while a celebration is due avoids a frame of the finished dot.
  const start = celebration ? 0 : 1;
  const pop = useSharedValue(start);
  /** How far the glow has faded out. */
  const glowFade = useSharedValue(start);
  const ripple = useSharedValue(start);
  const burst = useSharedValue(start);
  const sound = useSoundEffect(require('@/assets/sounds/day-complete.wav'));

  useEffect(() => {
    if (!celebrate) return;
    // Not cancelled on cleanup: the celebration is marked as played the moment it starts, which
    // re-runs this effect before the sound is due.
    setTimeout(sound.play, delayMs);
    pop.set(0);
    glowFade.set(0);
    ripple.set(0);
    burst.set(0);
    pop.set(
      withDelay(
        delayMs,
        withSequence(
          withTiming(1.35, { duration: 260, easing: Easing.out(Easing.back(1.5)) }),
          withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
        )
      )
    );
    glowFade.set(withDelay(delayMs + 1100, withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) })));
    ripple.set(withDelay(delayMs + 180, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })));
    burst.set(withDelay(delayMs + 180, withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) })));
  }, [burst, celebrate, delayMs, glowFade, pop, ripple, sound]);

  // Gone once filled, or its anti-aliased edge shows as a faint rim round the fill.
  const emptyStyle = useAnimatedStyle(() => ({
    opacity: pop.value < 1 ? 1 : 0,
  }));
  const fillStyle = useAnimatedStyle(() => ({
    opacity: Math.min(pop.value * 3, 1),
    transform: [{ scale: pop.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Math.max(pop.value, 0) }, { rotate: `${(1 - Math.min(pop.value, 1)) * -45}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: Math.min(pop.value, 1) * (1 - glowFade.value),
    transform: [{ scale: pop.value }],
  }));
  // The second ring trails the first, so the wave reads as a pulse rather than a single outline.
  // Hidden until they start moving, so they don't sit on the empty dot during the delay.
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ripple.value === 0 ? 0 : (1 - ripple.value) * 0.9,
    transform: [{ scale: 1 + ripple.value * 2.2 }],
  }));
  const trailingRippleStyle = useAnimatedStyle(() => {
    const p = Math.max(ripple.value * 1.4 - 0.4, 0);
    return {
      opacity: ripple.value === 0 ? 0 : (1 - p) * 0.6,
      transform: [{ scale: 1 + p * 1.6 }],
    };
  });

  return (
    <View style={styles.dot}>
      {/* Empty, like an untrained day, until the fill pops in over it. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.fill, { backgroundColor: theme.backgroundSelected }, emptyStyle]}
      />
      <Animated.View pointerEvents="none" style={[styles.ripple, { borderColor: theme.trained }, rippleStyle]} />
      <Animated.View
        pointerEvents="none"
        style={[styles.ripple, { borderColor: theme.trained }, trailingRippleStyle]}
      />
      {Array.from({ length: SPARKLES }, (_, i) => (
        <Sparkle key={i} index={i} progress={burst} color={theme.trained} />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          { backgroundColor: theme.trained, boxShadow: `0 0 16px 2px ${theme.trained}B3` },
          glowStyle,
        ]}
      />
      <Animated.View style={[styles.fill, { backgroundColor: theme.trained }, fillStyle]}>
        <Animated.View style={checkStyle}>
          <Icon name={{ ios: 'checkmark', android: 'check' }} size={16} color="onTint" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Sparkle({ index, progress, color }: { index: number; progress: SharedValue<number>; color: string }) {
  // Evenly spread, with every other one a little shorter so the burst doesn't look like a clock face.
  const angle = (index / SPARKLES) * Math.PI * 2 - Math.PI / 2;
  const reach = index % 2 === 0 ? SPARKLE_REACH : SPARKLE_REACH * 0.7;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p === 1 ? 0 : Math.min(p * 4, 1) * (1 - p),
      transform: [
        { translateX: Math.cos(angle) * reach * p },
        { translateY: Math.sin(angle) * reach * p },
        { scale: 1.4 - p * 0.9 },
      ],
    };
  });

  return <Animated.View pointerEvents="none" style={[styles.sparkle, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    ...StyleSheet.absoluteFill,
    borderRadius: DOT / 2,
    borderWidth: 2,
  },
  sparkle: {
    position: 'absolute',
    width: SPARKLE_SIZE,
    height: SPARKLE_SIZE,
    borderRadius: SPARKLE_SIZE / 2,
  },
});
