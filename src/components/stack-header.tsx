import type { NativeStackHeaderProps } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedView } from './themed-view';

/**
 * Header for every stack screen, drawn in React instead of the native header. On Android the
 * native header doesn't pick up a runtime theme switch and stays dark until the app reloads,
 * while plain views re-render with the new colors immediately.
 *
 * Only a back (or close) button: screens show their own large title in the content, like the
 * tab screens.
 */
export function StackHeader({ back, options, navigation }: NativeStackHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isModal = options.presentation === 'modal';

  return (
    <ThemedView style={[styles.header, { paddingTop: insets.top }]}>
      {back ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={isModal ? 'Close' : 'Back'}
          hitSlop={Spacing.two}
          onPress={navigation.goBack}
          pressedScale={0.9}
          style={[styles.backButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Icon
            name={isModal ? { ios: 'xmark', android: 'close' } : { ios: 'chevron.left', android: 'arrow_back' }}
            size={20}
            color="text"
          />
        </PressableScale>
      ) : (
        <View style={styles.placeholder} />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    height: 40,
  },
});
