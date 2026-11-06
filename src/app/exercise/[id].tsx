import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ExerciseVideo } from '@/components/exercise-video';
import { IconBadge } from '@/components/icon-badge';
import { InstructionList } from '@/components/instruction-list';
import { PageHeader } from '@/components/page-header';
import { FlatList, ScrollView } from '@/components/scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { EXERCISES, getExercise, getExercises, type Exercise } from '@/data/exercises';

export default function ExerciseScreen() {
  // `list` is the ids of the exercises it was opened from, in order, to swipe through. Without it,
  // say from a link, it swipes through the whole library.
  const { id, list } = useLocalSearchParams<{ id: string; list?: string }>();
  const exercise = getExercise(id);
  const [exercises] = useState(() => {
    const listed = list ? getExercises(list.split(',')) : EXERCISES;
    return exercise && !listed.includes(exercise) ? [exercise] : listed;
  });
  const [index, setIndex] = useState(() => Math.max(0, exercises.findIndex((item) => item.id === id)));
  const { width } = useWindowDimensions();

  if (!exercise) {
    return (
      <ThemedView style={styles.notFound}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <ThemedText themeColor="textSecondary">This exercise doesn&apos;t exist.</ThemedText>
      </ThemedView>
    );
  }

  const current = exercises[index];

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: current.name }} />
      <FlatList
        horizontal
        pagingEnabled
        accessibilityLabel="Exercises, swipe to change"
        style={styles.screen}
        data={exercises}
        // Re-renders the pages on a swipe, so the new one starts playing and the old one stops.
        extraData={index}
        keyExtractor={(item) => item.id}
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        // Each page runs its own animation, so only the pages either side are kept ready.
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        onMomentumScrollEnd={(event) => {
          const page = Math.round(event.nativeEvent.contentOffset.x / width);
          if (page === index || !exercises[page]) return;
          setIndex(page);
          // Kept in step, so the screen comes back to the same exercise if it's restored.
          router.setParams({ id: exercises[page].id });
        }}
        renderItem={({ item, index: page }) => (
          <View style={{ width }}>
            <ExercisePage
              exercise={item}
              position={exercises.length > 1 ? `${page + 1} of ${exercises.length}` : undefined}
              showing={page === index}
            />
          </View>
        )}
      />
    </ThemedView>
  );
}

/**
 * One exercise: its video stays in place while the details scroll below it. Only the page on
 * screen plays its animation, from the start each time it's swiped to, and moves its title into
 * the header, so a page swiped away doesn't leave its name up there.
 */
function ExercisePage({ exercise, position, showing }: { exercise: Exercise; position?: string; showing: boolean }) {
  return (
    <>
      <ExerciseVideo photo={exercise.photo} animation={exercise.animation} playing={showing} />
      <PageScroll>
        <PageHeader
          eyebrow={[exercise.active ? 'Active' : 'Passive', exercise.twoSided && 'Both sides', position]
            .filter(Boolean)
            .join(' · ')}
          title={exercise.name}
          titleInHeader={showing}
        />
        <OverviewCard exercise={exercise} />
      </PageScroll>
    </>
  );
}

function PageScroll({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + Spacing.four }]}>
      {children}
    </ScrollView>
  );
}

function OverviewCard({ exercise }: { exercise: Exercise }) {
  return (
    <>
      <Card style={styles.stimulus}>
        <IconBadge name={{ ios: 'scope', android: 'target' }} />
        <View style={styles.stimulusText}>
          <ThemedText type="eyebrow" themeColor="textSecondary" accessibilityRole="header">
            Stimulus
          </ThemedText>
          <ThemedText>{exercise.stimulus}</ThemedText>
        </View>
      </Card>

      <Card style={styles.card}>
        <ThemedText type="subtitle" accessibilityRole="header">
          Instructions
        </ThemedText>
        <InstructionList instructions={exercise.instructions} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  stimulus: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  stimulusText: {
    flex: 1,
    gap: Spacing.half,
  },
  card: {
    gap: Spacing.three,
  },
});
