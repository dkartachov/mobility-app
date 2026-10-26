import { StyleSheet, View } from 'react-native';

import { Icon } from './icon';
import { ThemedText } from './themed-text';

/**
 * Placeholder for the exercise video. Once videos exist, swap this for an autoplaying,
 * looping `VideoView` from `expo-video`.
 */
export function ExerciseVideo() {
  return (
    <View style={styles.video} accessibilityLabel="Exercise video, coming soon">
      <Icon name={{ ios: 'play.circle.fill', android: 'play_circle' }} size={48} color="onTint" />
      <ThemedText type="small" style={styles.label}>
        Video coming soon
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0B1A19',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
});
