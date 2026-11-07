import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { PageHeader } from '@/components/page-header';
import { ScrollView } from '@/components/scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimePicker } from '@/components/time-picker';
import { Spacing } from '@/constants/theme';
import { EQUIPMENT, EQUIPMENT_LABELS, EXERCISE_TYPE_LABELS, EXERCISE_TYPES, POSITION_LABELS, POSITIONS } from '@/data/exercises';
import { DAILY_MINUTES } from '@/lib/workout';
import { setWorkoutFilters, useWorkoutFilters } from '@/lib/workout-filters';

function toggled<T>(items: readonly T[], item: T) {
  return items.includes(item) ? items.filter((other) => other !== item) : [...items, item];
}

function startTitle(minutes: number | null, hasPosition: boolean, hasType: boolean) {
  if (minutes === null) return 'Pick a time';
  if (!hasPosition) return 'Pick a position';
  if (!hasType) return 'Pick a type';
  return `Start ${minutes} min routine`;
}

export default function DailyScreen() {
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState<number | null>(null);
  const filters = useWorkoutFilters();
  const hasPosition = filters.positions.length > 0;
  const hasType = filters.types.length > 0;

  return (
    <ThemedView style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <PageHeader eyebrow="Daily routine" title="How much time do you have?" />
        <TimePicker minutes={minutes} onChange={setMinutes} />
        <View style={styles.filter}>
          <ThemedText type="eyebrow" themeColor="textSecondary" accessibilityRole="header">
            Position
          </ThemedText>
          <View style={styles.chips}>
            {POSITIONS.map((position) => (
              <Chip
                key={position}
                multiSelect
                label={POSITION_LABELS[position]}
                selected={filters.positions.includes(position)}
                onPress={() => setWorkoutFilters({ ...filters, positions: toggled(filters.positions, position) })}
              />
            ))}
          </View>
        </View>
        <View style={styles.filter}>
          <ThemedText type="eyebrow" themeColor="textSecondary" accessibilityRole="header">
            Equipment
          </ThemedText>
          <View style={styles.chips}>
            {EQUIPMENT.map((equipment) => (
              <Chip
                key={equipment}
                multiSelect
                label={EQUIPMENT_LABELS[equipment]}
                selected={filters.equipment.includes(equipment)}
                onPress={() => setWorkoutFilters({ ...filters, equipment: toggled(filters.equipment, equipment) })}
              />
            ))}
          </View>
        </View>
        <View style={styles.filter}>
          <ThemedText type="eyebrow" themeColor="textSecondary" accessibilityRole="header">
            Type
          </ThemedText>
          <View style={styles.chips}>
            {EXERCISE_TYPES.map((type) => (
              <Chip
                key={type}
                multiSelect
                label={EXERCISE_TYPE_LABELS[type]}
                selected={filters.types.includes(type)}
                onPress={() => setWorkoutFilters({ ...filters, types: toggled(filters.types, type) })}
              />
            ))}
          </View>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Exercises are picked for you and change every time.
        </ThemedText>
      </ScrollView>

      {/* Always laid out, so picking a time doesn't make the screen jump. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button
          title={startTitle(minutes, hasPosition, hasType)}
          disabled={minutes === null || !hasPosition || !hasType}
          onPress={() => router.push({ pathname: '/workout', params: { minutes: minutes ?? DAILY_MINUTES[0] } })}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
    gap: Spacing.four,
  },
  footer: {
    paddingHorizontal: Spacing.screen,
  },
  filter: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});

