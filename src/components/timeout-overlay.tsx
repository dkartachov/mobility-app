import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useFirstTimeInstructions } from '@/lib/instructions';
import { TIMEOUT_EXTEND_SECONDS, formatTimeoutLength } from '@/lib/timeout-preference';
import { formatClock, pickRandom } from '@/lib/workout';

import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

const MESSAGES = ['Timeout!', 'Shake it off', "You've earned it", 'Catch your breath', 'Loosen up'];

type TimeoutOverlayProps = {
  remainingMs: number;
  onExtend: () => void;
  onResume: () => void;
};

/** Covers the whole screen during a timeout. Tapping the timer adds time; a tap anywhere else, or Android's back, ends it early. */
export function TimeoutOverlay({ remainingMs, onExtend, onResume }: TimeoutOverlayProps) {
  // Picked once per timeout: this mounts when one starts, and re-renders with every tick.
  const [message] = useState(() => pickRandom(MESSAGES));
  const showInstructions = useFirstTimeInstructions('timeout');

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onResume}>
      {/* The backdrop is a sibling rather than a parent of the timer, which screen readers couldn't reach inside a button. */}
      <Pressable accessibilityRole="button" accessibilityLabel="Resume workout" onPress={onResume} style={styles.backdrop} />
      {/* Only the timer takes touches, so taps on the text around it still land on the backdrop. */}
      <View pointerEvents="box-none" style={styles.content}>
        <View pointerEvents="none">
          <ThemedText type="eyebrow" style={styles.text}>
            {showInstructions ? `Tap the timer to add ${formatTimeoutLength(TIMEOUT_EXTEND_SECONDS)}` : message}
          </ThemedText>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Add ${TIMEOUT_EXTEND_SECONDS} seconds`}
          onPress={onExtend}
          hitSlop={{ bottom: Spacing.five }}
          style={styles.timer}>
          <ThemedText type="stat" style={[styles.text, styles.clock]}>
            {formatClock(Math.ceil(remainingMs / 1000))}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.text}>
            +{formatTimeoutLength(TIMEOUT_EXTEND_SECONDS)}
          </ThemedText>
        </PressableScale>
        {showInstructions && (
          <View pointerEvents="none" style={styles.instructions}>
            <ThemedText style={styles.text}>Tap anywhere else to resume</ThemedText>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  timer: {
    alignItems: 'center',
  },
  instructions: {
    marginTop: Spacing.six,
  },
  // The backdrop is dark in both themes, so the theme's text color can't be used here.
  text: {
    color: '#FFFFFF',
  },
  clock: {
    fontSize: 96,
    lineHeight: 104,
    letterSpacing: -2,
  },
});
