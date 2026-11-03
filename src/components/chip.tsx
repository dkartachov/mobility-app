import { StyleSheet } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** One of several that can be selected together, rather than one of a group of options. */
  multiSelect?: boolean;
};

export function Chip({ label, selected, onPress, multiSelect }: ChipProps) {
  const theme = useTheme();

  return (
    <PressableScale
      accessibilityRole={multiSelect ? 'checkbox' : 'radio'}
      accessibilityState={multiSelect ? { checked: selected } : { selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.tint : theme.backgroundElement,
          borderColor: selected ? theme.tint : theme.border,
        },
      ]}>
      <ThemedText type="smallBold" themeColor={selected ? 'onTint' : 'text'}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
