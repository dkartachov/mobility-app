import type { NativeStackHeaderProps } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

import { Icon } from './icon';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

/**
 * Header for every stack screen, drawn in React instead of the native header. On Android the
 * native header doesn't pick up a runtime theme switch and stays dark until the app reloads,
 * while plain views re-render with the new colors immediately.
 */
export function StackHeader({ back, options, navigation }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const isModal = options.presentation === 'modal';

  return (
    <ThemedView style={[styles.header, { paddingTop: insets.top }]}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isModal ? 'Close' : 'Back'}
          onPress={navigation.goBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Icon
            name={isModal ? { ios: 'xmark', android: 'close' } : { ios: 'chevron.left', android: 'arrow_back' }}
            size={24}
            color="tint"
          />
        </Pressable>
      ) : (
        <View style={styles.backButton} />
      )}
      <ThemedText type="subtitle" accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {options.title}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
    minHeight: 56,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
