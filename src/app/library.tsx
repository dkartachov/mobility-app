import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ExercisePhoto } from '@/components/exercise-photo';
import { TextField } from '@/components/field';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { EXERCISES, searchExercises, type Exercise } from '@/data/exercises';
import { useTheme } from '@/hooks/use-theme';

export default function LibraryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const results = searchExercises(query);
  const total = `${EXERCISES.length} ${EXERCISES.length === 1 ? 'exercise' : 'exercises'}`;

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
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search exercises"
          />
          <ThemedText type="smallBold" themeColor="textSecondary">
            {query.trim() ? `${results.length} of ${total}` : total}
          </ThemedText>
        </View>
      }
      ListEmptyComponent={
        <ThemedText themeColor="textSecondary">No exercises match &quot;{query.trim()}&quot;.</ThemedText>
      }
      renderItem={({ item }) => <ExerciseTile exercise={item} />}
    />
  );
}

function ExerciseTile({ exercise }: { exercise: Exercise }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.tile}>
        <ExercisePhoto style={styles.photo} />
        <ThemedText type="subtitle" style={styles.name}>
          {exercise.name}
        </ThemedText>
        <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} color="textSecondary" size={16} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
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
    width: 72,
    height: 72,
  },
  name: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
