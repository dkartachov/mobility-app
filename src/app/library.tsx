import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { ExercisePhoto } from '@/components/exercise-photo';
import { TextField } from '@/components/field';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { Pill } from '@/components/pill';
import { PressableScale } from '@/components/pressable-scale';
import { FlatList, ScrollView } from '@/components/scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  EXERCISE_TYPE_LABELS,
  EXERCISE_TYPES,
  EXERCISES,
  POSITION_LABELS,
  POSITIONS,
  searchExercises,
  type Exercise,
} from '@/data/exercises';
import { useTheme } from '@/hooks/use-theme';
import {
  filterLibrary,
  hasLibraryFilters,
  NO_LIBRARY_FILTERS,
  toggleLibraryFilter,
  type LibraryFilters,
} from '@/lib/library-filters';

/** Every filter in one row, grouped by what they filter. */
const FILTER_CHIPS = [
  ...POSITIONS.map((value) => ({ group: 'positions' as const, value, label: POSITION_LABELS[value] })),
  ...EQUIPMENT.map((value) => ({ group: 'equipment' as const, value, label: EQUIPMENT_LABELS[value] })),
  ...EXERCISE_TYPES.map((value) => ({ group: 'types' as const, value, label: EXERCISE_TYPE_LABELS[value] })),
];

export default function LibraryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<LibraryFilters>(NO_LIBRARY_FILTERS);
  // The list follows a moment behind, so the chips and search field respond straight away instead
  // of waiting for every tile to render; otherwise a chip's fade stalls until the list is done.
  const listQuery = useDeferredValue(query);
  const listFilters = useDeferredValue(filters);
  const searching = listQuery.trim() !== '';
  const filtering = hasLibraryFilters(listFilters);
  const results = filterLibrary(searchExercises(listQuery), listFilters);
  const total = `${EXERCISES.length} ${EXERCISES.length === 1 ? 'exercise' : 'exercises'}`;
  const empty = searching
    ? `No exercises match "${listQuery.trim()}"${filtering ? ' with these filters' : ''}.`
    : 'No exercises match these filters.';

  const clear = () => {
    setQuery('');
    setFilters(NO_LIBRARY_FILTERS);
  };

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
            eyebrow={searching || filtering ? `${results.length} of ${total}` : total}
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
          {/* Runs to the screen's edges, so chips scroll off them instead of being cut short inside the padding. */}
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            accessibilityLabel="Filters"
            style={styles.chipList}
            contentContainerStyle={styles.chips}>
            <Chip label="All" selected={!hasLibraryFilters(filters)} onPress={() => setFilters(NO_LIBRARY_FILTERS)} />
            {FILTER_CHIPS.map(({ group, value, label }) => (
              <Chip
                key={value}
                multiSelect
                label={label}
                selected={(filters[group] as readonly string[]).includes(value)}
                onPress={() => setFilters(toggleLibraryFilter(filters, group, value))}
              />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Icon name={{ ios: 'magnifyingglass', android: 'search_off' }} color="textSecondary" size={36} />
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            {empty}
          </ThemedText>
          <View style={styles.emptyButton}>
            <Button
              title={searching && filtering ? 'Clear all' : searching ? 'Clear search' : 'Clear filters'}
              variant="secondary"
              onPress={clear}
            />
          </View>
        </View>
      }
      renderItem={({ item }) => <ExerciseTile exercise={item} />}
    />
  );
}

function ExerciseTile({ exercise }: { exercise: Exercise }) {
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
  content: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
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
  chipList: {
    marginHorizontal: -Spacing.screen,
  },
  chips: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.screen,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  emptyText: {
    textAlign: 'center',
  },
  emptyButton: {
    alignSelf: 'center',
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
});
