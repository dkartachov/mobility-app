import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAndroidKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useTheme } from '@/hooks/use-theme';

import { ScrollView } from './scroll-view';

/**
 * Scrollable container for modal forms (shown under the Stack header), which keeps the field
 * being typed in above the keyboard. On iOS the scroll view does that itself. On Android the
 * keyboard covers the screen instead of shrinking it, so the form is padded by the keyboard's
 * height: it reaches the bottom of the screen, so that's exactly how much is hidden. Android's
 * scroll view then keeps the focused field, and the cursor as it moves, in view.
 */
export function FormScreen({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useAndroidKeyboardHeight();

  return (
    <View testID="form-screen" style={[styles.screen, { backgroundColor: theme.background, paddingBottom: keyboardHeight }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.content,
          // The keyboard already covers the navigation bar.
          { paddingBottom: (keyboardHeight > 0 ? 0 : insets.bottom) + Spacing.four },
        ]}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
    gap: Spacing.four,
  },
});
