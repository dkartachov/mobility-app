import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

/** A labelled form row. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="eyebrow" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

/** Text input whose border turns the accent color while focused. */
export function TextField({ onFocus, onBlur, ...props }: TextInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      selectionColor={theme.tint}
      {...props}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        {
          color: theme.text,
          backgroundColor: theme.backgroundElement,
          borderColor: focused ? theme.tint : theme.border,
        },
        props.style,
      ]}
    />
  );
}

export const inputStyles = StyleSheet.create({
  box: {
    borderRadius: Radius.medium + 2,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 4,
    minHeight: 52,
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
