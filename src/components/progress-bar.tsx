import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** `progress` is clamped to 0–1. */
export function ProgressBar({ progress }: { progress: number }) {
  const theme = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: theme.tint }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
