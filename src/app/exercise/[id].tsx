import { Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ExerciseVideo } from '@/components/exercise-video';
import { Pager } from '@/components/pager';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getExercise, type Exercise } from '@/data/exercises';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = getExercise(id);

  if (!exercise) {
    return (
      <ThemedView style={styles.notFound}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <ThemedText themeColor="textSecondary">This exercise doesn&apos;t exist.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: exercise.name }} />
      {/* The video stays in place while you swipe between the cards below. */}
      <ExerciseVideo />
      <Pager>
        <PageScroll>
          <OverviewCard exercise={exercise} />
        </PageScroll>
      </Pager>
    </ThemedView>
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
    <Card style={styles.card}>
      <View style={styles.section}>
        <ThemedText type="subtitle" accessibilityRole="header">
          Stimulus
        </ThemedText>
        <ThemedText themeColor="textSecondary">{exercise.stimulus}</ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" accessibilityRole="header">
          Instructions
        </ThemedText>
        {exercise.instructions.map((step, index) => (
          <View key={index} style={styles.step}>
            <ThemedText type="smallBold" themeColor="tint" style={styles.stepNumber}>
              {index + 1}.
            </ThemedText>
            <ThemedText style={styles.stepText}>{step}</ThemedText>
          </View>
        ))}
      </View>
    </Card>
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
    padding: Spacing.three,
  },
  card: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stepNumber: {
    minWidth: 20,
    lineHeight: 24,
  },
  stepText: {
    flex: 1,
  },
});
