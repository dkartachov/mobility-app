import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { ExerciseAnimation } from '@/lib/figure-rig';

import { ExerciseFigure, ExerciseHand } from './exercise-figure';
import { Icon } from './icon';
import { ThemedText } from './themed-text';

/**
 * The exercise's looping figure animation if it has one, then its photo, otherwise a "coming soon"
 * panel. Once videos exist, swap this for an autoplaying, looping `VideoView` from `expo-video`.
 * While not `playing`, the animation waits on its first frame, and plays from the start once it is.
 */
export function ExerciseVideo({
  photo,
  animation,
  playing = true,
}: {
  photo?: ImageSource;
  animation?: ExerciseAnimation;
  playing?: boolean;
}) {
  if (animation) {
    return (
      <View style={styles.video}>
        {animation.view === 'hand' ? (
          <ExerciseHand clip={animation} playing={playing} />
        ) : (
          <ExerciseFigure clip={animation} playing={playing} />
        )}
      </View>
    );
  }

  if (photo) {
    return (
      <View style={styles.video}>
        <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
      </View>
    );
  }

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
