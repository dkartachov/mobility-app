import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: isPrimary ? theme.tint : theme.tintSoft },
        variant === 'destructive' && { backgroundColor: theme.backgroundElement },
        (pressed || disabled) && styles.dimmed,
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.four,
  },
  content: {
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
  },
  dimmed: {
    opacity: 0.6,
  },
});
