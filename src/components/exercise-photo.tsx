import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';

import { Icon } from './icon';
import { ThemedView } from './themed-view';

/** Shows the exercise's photo, or a placeholder icon for exercises that don't have one yet. */
export function ExercisePhoto({ source, style }: { source?: ImageSource; style?: StyleProp<ViewStyle> }) {
  return (
    <ThemedView type="backgroundSelected" style={[styles.photo, style]}>
      {source ? (
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Icon name={{ ios: 'figure.flexibility', android: 'self_improvement' }} color="textSecondary" size={28} />
      )}
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
