import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

/** An exercise's instructions as numbered steps. */
export function InstructionList({ instructions }: { instructions: string[] }) {
  const theme = useTheme();

  return (
    <View style={styles.list}>
      {instructions.map((step, index) => (
        <View key={index} style={styles.step}>
          <View style={[styles.stepNumber, { backgroundColor: theme.tintSoft }]}>
            <ThemedText type="smallBold" themeColor="tint">
              {index + 1}
            </ThemedText>
          </View>
          <ThemedText style={styles.stepText}>{step}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
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
