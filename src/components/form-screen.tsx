import type { ReactNode, Ref } from 'react';
import { StyleSheet, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ScrollView } from './scroll-view';

/** Scrollable container for modal forms (shown under the Stack header). */
export function FormScreen({ children, ref }: { children: ReactNode; ref?: Ref<ScrollViewInstance> }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      ref={ref}
      style={{ backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
});
