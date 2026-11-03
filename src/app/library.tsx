import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ExercisePhoto } from '@/components/exercise-photo';
import { TextField } from '@/components/field';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { PressableScale } from '@/components/pressable-scale';
import { FlatList } from '@/components/scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  EXERCISE_TYPE_LABELS,
  EXERCISE_TYPES,
  EXERCISES,
  searchExercises,
  type Exercise,
  type ExerciseType,
} from '@/data/exercises';
import { useTheme } from '@/hooks/use-theme';

const typeOf = (exercise: Exercise): ExerciseType => (exercise.active ? 'active' : 'passive');

export default function LibraryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  /** Null shows every type. */
  const [type, setType] = useState<ExerciseType | null>(null);
  const results = searchExercises(query).filter((exercise) => type === null || typeOf(exercise) === type);
  const filtered = query.trim() !== '' || type !== null;
  const total = `${EXERCISES.length} ${EXERCISES.length === 1 ? 'exercise' : 'exercises'}`;
  const empty = query.trim()
    ? `No ${type ? `${EXERCISE_TYPE_LABELS[type].toLowerCase()} ` : ''}exercises match "${query.trim()}".`
    : 'No exercises of this type.';

  return (
    <FlatList
      data={results}
      keyExtractor={(exercise) => exercise.id}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={
        <View style={styles.header}>
          <PageHeader
            eyebrow={filtered ? `${results.length} of ${total}` : total}
            eyebrowColor="textSecondary"
            title="Library"
          />
          <View>
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search exercises"
              style={styles.search}
            />
            <View style={styles.searchIcon} pointerEvents="none">
              <Icon name={{ ios: 'magnifyingglass', android: 'search' }} color="textSecondary" size={18} />
            </View>
          </View>
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Exercise type">
            <Chip label="All" selected={type === null} onPress={() => setType(null)} />
            {EXERCISE_TYPES.map((option) => (
              <Chip
                key={option}
                label={EXERCISE_TYPE_LABELS[option]}
                selected={type === option}
                onPress={() => setType(option)}
              />
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={<ThemedText themeColor="textSecondary">{empty}</ThemedText>}
      renderItem={({ item }) => <ExerciseTile exercise={item} />}
    />
  );
}

function ExerciseTile({ exercise }: { exercise: Exercise }) {
  const theme = useTheme();
  const tags = [exercise.active ? 'Active' : 'Passive', exercise.twoSided && 'Both sides'].filter(
    (tag): tag is string => Boolean(tag)
  );

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}>
      <Card style={styles.tile}>
        <ExercisePhoto source={exercise.photo} style={styles.photo} />
        <View style={styles.text}>
          <ThemedText type="subtitle" numberOfLines={2}>
            {exercise.name}
          </ThemedText>
          <View style={styles.tags}>
            {tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="eyebrow" themeColor="textSecondary" style={styles.tagText}>
                  {tag}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
        <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} color="textSecondary" size={16} />
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.three,
  },
  search: {
    paddingLeft: Spacing.five + Spacing.one,
  },
  searchIcon: {
    position: 'absolute',
    left: Spacing.three,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
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
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.full,
  },
  tagText: {
    fontSize: 10,
    lineHeight: 14,
  },
});
