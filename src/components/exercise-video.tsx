import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { Clip3D } from '@/lib/rig3d';

import { ExerciseFigure3D } from './exercise-figure-3d';
import { Icon } from './icon';
import { ThemedText } from './themed-text';

/**
 * The exercise's looping figure animation if it has one, then its photo, otherwise a "coming soon"
 * panel. Once videos exist, swap this for an autoplaying, looping `VideoView` from `expo-video`.
 * While not `playing`, the animation waits on its first frame, and plays from the start once it is.
 * While `paused`, it freezes on its current frame and carries on from there once it isn't.
 */
export function ExerciseVideo({
  photo,
  animation,
  playing = true,
  paused = false,
  caption,
}: {
  /** Written over the photo, when it's shown. */
  caption?: string;
  photo?: ImageSource;
  animation?: Clip3D;
  playing?: boolean;
  paused?: boolean;
}) {
  if (animation) {
    return (
      <View style={styles.video}>
        <ExerciseFigure3D clip={animation} playing={playing} paused={paused} />
      </View>
    );
  }

  if (photo) {
    return (
      <View style={styles.video}>
        <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
        {caption && (
          <View style={styles.caption}>
            <ThemedText type="small" style={styles.captionText}>
              {caption}
            </ThemedText>
          </View>
        )}
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
  caption: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 26, 25, 0.7)',
  },
  captionText: {
    color: '#FFFFFF',
  },
});
