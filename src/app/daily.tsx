import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { EQUIPMENT, EQUIPMENT_LABELS, POSITION_LABELS, POSITIONS } from '@/data/exercises';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/lib/theme-preference';
import { DAILY_MINUTES } from '@/lib/workout';
import { setWorkoutFilters, useWorkoutFilters } from '@/lib/workout-filters';

/** Shown under each option, shortest first. */
const OPTION_LABELS = ['Quick', 'Standard', 'Deep'];

function toggled<T>(items: readonly T[], item: T) {
  return items.includes(item) ? items.filter((other) => other !== item) : [...items, item];
}

function startTitle(minutes: number | null, hasPosition: boolean) {
  if (minutes === null) return 'Pick a time';
  if (!hasPosition) return 'Pick a position';
  return `Start ${minutes} min routine`;
}

export default function DailyScreen() {
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState<number | null>(null);
  const filters = useWorkoutFilters();
  const hasPosition = filters.positions.length > 0;

  return (
    <ThemedView style={[styles.screen, { paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.content}>
        <PageHeader eyebrow="Daily routine" title="How much time do you have?" />
        <View style={styles.options} accessibilityRole="radiogroup">
          {DAILY_MINUTES.map((value, i) => (
            <TimeOption
              key={value}
              minutes={value}
              label={OPTION_LABELS[i]}
              selected={minutes === value}
              onPress={() => setMinutes(value)}
            />
          ))}
        </View>
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
        <ThemedText type="small" themeColor="textSecondary">
          Exercises are picked for you and change every time.
        </ThemedText>
      </View>

      {/* Always laid out, so picking a time doesn't make the screen jump. */}
      <Button
        title={startTitle(minutes, hasPosition)}
        disabled={minutes === null || !hasPosition}
        onPress={() => router.push({ pathname: '/workout', params: { minutes: minutes ?? DAILY_MINUTES[0] } })}
      />
    </ThemedView>
  );
}

type TimeOptionProps = {
  minutes: number;
  label?: string;
  selected: boolean;
  onPress: () => void;
};

function TimeOption({ minutes, label, selected, onPress }: TimeOptionProps) {
  const theme = useTheme();
  const scheme = useColorScheme();

  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${minutes} minutes`}
      onPress={onPress}
      style={[
        styles.option,
        selected
          ? { backgroundColor: theme.tint, boxShadow: `0 8px 20px ${theme.tint}55` }
          : [{ backgroundColor: theme.backgroundElement }, Elevation[scheme]],
      ]}>
      {selected && (
        <View style={styles.check}>
          <Icon name={{ ios: 'checkmark.circle.fill', android: 'check_circle' }} size={20} color="onTint" />
        </View>
      )}
      <ThemedText type="stat" themeColor={selected ? 'onTint' : 'text'} style={styles.minutes}>
        {minutes}
      </ThemedText>
      <ThemedText type="smallBold" themeColor={selected ? 'onTint' : 'textSecondary'}>
        min
      </ThemedText>
      {label && (
        <ThemedText type="eyebrow" themeColor={selected ? 'onTint' : 'tint'} style={styles.label}>
          {label}
        </ThemedText>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: Spacing.three,
    justifyContent: 'space-between',
  },
  content: {
    gap: Spacing.four,
  },
  options: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  option: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: Spacing.two + Spacing.one,
    right: Spacing.two + Spacing.one,
  },
  minutes: {
    fontSize: 40,
    lineHeight: 46,
  },
  label: {
    marginTop: Spacing.two,
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
