import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type ScreenProps = {
  title: string;
  subtitle?: string;
  /** Shown to the right of the title, e.g. an icon button. */
  headerAction?: ReactNode;
  children: ReactNode;
};

/** Scrollable tab screen with a large in-content title. */
export function Screen({ title, subtitle, headerAction, children }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.three,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          paddingLeft: insets.left + Spacing.three,
          paddingRight: insets.right + Spacing.three,
        },
      ]}>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <ThemedText type="title" accessibilityRole="header">
            {title}
          </ThemedText>
          {subtitle && <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>}
        </View>
        {headerAction}
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  header: {
    flex: 1,
    gap: Spacing.one,
  },
});
