import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import type { Exercise } from '@/data/exercises';

import { Card } from './card';
import { ExercisePhoto } from './exercise-photo';
import { Icon } from './icon';
import { Pill } from './pill';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/** A slow, slightly bouncy turn, so the photo flipping over is the reward for holding on. */
const FLIP = { damping: 14, stiffness: 120, mass: 1 } as const;
/** How long the tile has to be held to find an easter egg: longer than a long-press, like a pat. */
const FIND_EGG_MS = 1200;

/**
 * Opens the exercise, and lets you swipe on through the rest of the list it was picked from.
 * `eggs` are the exercises whose easter egg has been found: this one's photo is turned over to show
 * it, and the exercise screen shows it in place of the animation. Holding the tile calls `onFindEgg`.
 */
export function ExerciseTile({
  exercise,
  list,
  eggs,
  onFindEgg,
}: {
  exercise: Exercise;
  list: readonly Exercise[];
  eggs?: ReadonlySet<string>;
  onFindEgg?: () => void;
}) {
  const tags = [exercise.active ? 'Active' : 'Passive', exercise.twoSided && 'Both sides'].filter(
    (tag): tag is string => Boolean(tag)
  );
  const found = Boolean(exercise.easterEgg && eggs?.has(exercise.id));

  return (
    <PressableScale
      accessibilityRole="button"
      delayLongPress={FIND_EGG_MS}
      onLongPress={exercise.easterEgg ? onFindEgg : undefined}
      onPress={() =>
        router.push({
          pathname: '/exercise/[id]',
          params: {
            id: exercise.id,
            list: list.map((item) => item.id).join(','),
            ...(eggs?.size ? { eggs: [...eggs].join(',') } : {}),
          },
        })
      }>
      <Card style={styles.tile}>
        <TilePhoto exercise={exercise} found={found} />
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

/** The photo, which turns over like a card to show the easter egg on its back once it's found. */
function TilePhoto({ exercise, found }: { exercise: Exercise; found: boolean }) {
  const turned = useSharedValue(found ? 1 : 0);
  useEffect(() => {
    turned.set(withSpring(found ? 1 : 0, FLIP));
  }, [found, turned]);
  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: 400 }, { rotateY: `${turned.get() * 180}deg` }],
  }));
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 400 }, { rotateY: `${turned.get() * 180 - 180}deg` }],
  }));

  if (!exercise.easterEgg) return <ExercisePhoto source={exercise.photo} style={styles.photo} />;

  return (
    <View style={styles.photo}>
      <Animated.View style={[styles.side, front]}>
        <ExercisePhoto source={exercise.photo} style={styles.photo} />
      </Animated.View>
      <Animated.View style={[styles.side, back]}>
        <ExercisePhoto source={exercise.easterEgg.photo} style={styles.photo} />
      </Animated.View>
    </View>
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
  side: {
    position: 'absolute',
    top: 0,
    left: 0,
    backfaceVisibility: 'hidden',
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
