import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { css } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { PressableScale } from '@/components/pressable-scale';
import { ScrollView } from '@/components/scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { EQUIPMENT, EQUIPMENT_LABELS, EXERCISE_TYPE_LABELS, EXERCISE_TYPES, POSITION_LABELS, POSITIONS } from '@/data/exercises';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/lib/haptics';
import { useColorScheme } from '@/lib/theme-preference';
import { DAILY_MINUTES } from '@/lib/workout';
import { setWorkoutFilters, useWorkoutFilters } from '@/lib/workout-filters';

/** Shown under each option, shortest first. */
const OPTION_LABELS = ['Quick', 'Standard', 'Deep'];

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
        <View style={styles.options} accessibilityRole="radiogroup">
          {DAILY_MINUTES.map((value, i) => (
            <TimeOption
              key={value}
              minutes={value}
              label={OPTION_LABELS[i]}
              selected={minutes === value}
              onPress={() => {
                haptic.select();
                setMinutes(value);
              }}
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
        cssStyles.fade,
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
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  footer: {
    paddingHorizontal: Spacing.three,
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

/** Reanimated CSS transitions, which React Native's `StyleSheet.create` doesn't type. */
const cssStyles = css.create({
  // Fades between selected and not, instead of snapping.
  fade: {
    transitionProperty: 'backgroundColor',
    transitionDuration: 150,
  },
});
