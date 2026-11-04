import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BadgeCoin, useBadgeSpin } from '@/components/badge-coin';
import { BadgeAura } from '@/components/milestone-badges';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { parseMilestoneHours } from '@/lib/milestones';

const BADGE_SIZE = 220;
const ENTER_MS = 1200;

/** A badge already earned, up close, to turn over and spin. */
export default function MilestoneBadgeScreen() {
  const insets = useSafeAreaInsets();
  const hours = parseMilestoneHours(useLocalSearchParams<{ hours: string }>().hours);
  const label = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const spinner = useBadgeSpin(rotation, scale);

  // Turns over once as it opens, landing flat on its front.
  useEffect(() => {
    scale.set(withSpring(1, { damping: 12, stiffness: 120 }));
    rotation.set(withTiming(360, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) }));
  }, [rotation, scale]);

  return (
    <ThemedView style={[styles.screen, { paddingBottom: insets.bottom + Spacing.six }]}>
      <View
        accessible
        accessibilityLabel={`${label} milestone badge`}
        style={styles.stage}
        {...spinner.panHandlers}>
        <BadgeAura hours={hours} size={BADGE_SIZE} />
        <BadgeCoin hours={hours} size={BADGE_SIZE} rotation={rotation} scale={scale} />
      </View>
      <Animated.View entering={FadeIn.delay(ENTER_MS / 2).duration(400)} style={styles.caption}>
        <ThemedText type="subtitle" themeColor="tint" style={styles.centered}>
          {label} of mobility time
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          Drag or tap to spin
        </ThemedText>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
    justifyContent: 'center',
    gap: Spacing.six,
  },
  stage: {
    alignSelf: 'center',
    width: BADGE_SIZE,
    height: BADGE_SIZE,
  },
  caption: {
    gap: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
});
