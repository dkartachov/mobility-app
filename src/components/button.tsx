import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { PressableScale } from './pressable-scale';
import { ThemedText } from './themed-text';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const textColor = isPrimary ? 'onTint' : variant === 'destructive' ? 'danger' : 'tint';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: isPrimary ? theme.tint : theme.tintSoft },
        isPrimary && { boxShadow: `0 6px 16px ${theme.tint}40` },
        variant === 'destructive' && { backgroundColor: theme.backgroundElement, borderColor: theme.danger },
        variant === 'destructive' && styles.outlined,
        disabled && styles.dimmed,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme[textColor]} />
        ) : (
          <ThemedText type="smallBold" themeColor={textColor} style={styles.label}>
            {title}
          </ThemedText>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.full,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  outlined: {
    borderWidth: 1,
  },
  content: {
    minHeight: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    letterSpacing: 0.2,
    // Full width rather than sized to the text: Android can measure bold, letter-spaced text a few
    // pixels short, which wraps the last word onto a line the button has no room for.
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  dimmed: {
    opacity: 0.5,
  },
});
