import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import type { Exercise } from '@/data/exercises';

import { Card } from './card';
import { ExercisePhoto } from './exercise-photo';
import { Icon } from './icon';
import { Pill } from './pill';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/** Opens the exercise, and lets you swipe on through the rest of the list it was picked from. */
export function ExerciseTile({ exercise, list }: { exercise: Exercise; list: readonly Exercise[] }) {
  const tags = [exercise.active ? 'Active' : 'Passive', exercise.twoSided && 'Both sides'].filter(
    (tag): tag is string => Boolean(tag)
  );

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/exercise/[id]',
          params: { id: exercise.id, list: list.map((item) => item.id).join(',') },
        })
      }>
      <Card style={styles.tile}>
        <ExercisePhoto source={exercise.photo} style={styles.photo} />
        <View style={styles.text}>
          <ThemedText type="subtitle" numberOfLines={2}>
            {exercise.name}
          </ThemedText>
          <View style={styles.tags}>
            {tags.map((tag) => (
              <Pill key={tag} label={tag} size="small" />
            ))}
          </View>
        </View>
        <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} color="textSecondary" size={16} />
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    paddingRight: Spacing.three,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: Radius.medium + 2,
  },
  text: {
    flex: 1,
    gap: Spacing.one + Spacing.half,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + Spacing.half,
  },
});
