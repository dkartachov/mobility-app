import { Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ExerciseVideo } from '@/components/exercise-video';
import { IconBadge } from '@/components/icon-badge';
import { PageHeader } from '@/components/page-header';
import { Pager } from '@/components/pager';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { getExercise, type Exercise } from '@/data/exercises';
import { useTheme } from '@/hooks/use-theme';

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
      <ExerciseVideo photo={exercise.photo} />
      <Pager>
        <PageScroll>
          <PageHeader
            eyebrow={[exercise.active ? 'Active' : 'Passive', exercise.twoSided && 'Both sides']
              .filter(Boolean)
              .join(' · ')}
            title={exercise.name}
          />
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
  const theme = useTheme();

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
        {exercise.instructions.map((step, index) => (
          <View key={index} style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.tintSoft }]}>
              <ThemedText type="smallBold" themeColor="tint">
                {index + 1}
              </ThemedText>
            </View>
            <ThemedText style={styles.stepText}>{step}</ThemedText>
          </View>
        ))}
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
    padding: Spacing.three,
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
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
  },
});
