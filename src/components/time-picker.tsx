import { StyleSheet, View } from 'react-native';
import { css } from 'react-native-reanimated';

import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/lib/haptics';
import { useColorScheme } from '@/lib/theme-preference';
import { DAILY_MINUTES } from '@/lib/workout';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

/** Shown under each option, shortest first. */
const OPTION_LABELS = ['Quick', 'Standard', 'Deep'];

type TimePickerProps = {
  /** `null` until one is picked. */
  minutes: number | null;
  onChange: (minutes: number) => void;
};

/** A large tile for each workout length, side by side. */
export function TimePicker({ minutes, onChange }: TimePickerProps) {
  return (
    <View style={styles.options} accessibilityRole="radiogroup">
      {DAILY_MINUTES.map((value, i) => (
        <TimeOption
          key={value}
          minutes={value}
          label={OPTION_LABELS[i]}
          selected={minutes === value}
          onPress={() => {
            haptic.select();
            onChange(value);
          }}
        />
      ))}
    </View>
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
    top: Spacing.twoAndHalf,
    right: Spacing.twoAndHalf,
  },
  minutes: {
    fontSize: 40,
    lineHeight: 46,
  },
  label: {
    marginTop: Spacing.two,
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
