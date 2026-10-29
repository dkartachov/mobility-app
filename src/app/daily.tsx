import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { PageHeader } from '@/components/page-header';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/lib/theme-preference';
import { DAILY_MINUTES } from '@/lib/workout';

/** Shown under each option, shortest first. */
const OPTION_LABELS = ['Quick', 'Standard', 'Deep'];

export default function DailyScreen() {
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState<number | null>(null);

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
        <ThemedText type="small" themeColor="textSecondary">
          Exercises are picked for you and change every time.
        </ThemedText>
      </View>

      {/* Always laid out, so picking a time doesn't make the screen jump. */}
      <Button
        title={minutes === null ? 'Pick a time' : `Start ${minutes} min routine`}
        disabled={minutes === null}
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
});
