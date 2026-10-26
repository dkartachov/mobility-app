import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

/** A labelled form row. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

export function TextField(props: TextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      selectionColor={theme.tint}
      {...props}
      style={[
        styles.input,
        { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        props.style,
      ]}
    />
  );
}

export const inputStyles = StyleSheet.create({
  box: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 4,
    minHeight: 48,
  },
});

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  input: {
    ...inputStyles.box,
    fontSize: 16,
  },
});
