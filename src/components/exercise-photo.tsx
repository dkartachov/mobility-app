import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';

import { Icon } from './icon';
import { ThemedView } from './themed-view';

/** Placeholder until exercises have real photos. */
export function ExercisePhoto({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <ThemedView type="backgroundSelected" style={[styles.photo, style]}>
      <Icon name={{ ios: 'figure.flexibility', android: 'self_improvement' }} color="textSecondary" size={28} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  photo: {
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
