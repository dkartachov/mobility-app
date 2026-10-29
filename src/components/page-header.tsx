import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing, type ThemeColor } from '@/constants/theme';

import { ThemedText } from './themed-text';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Small uppercase line above the title. */
  eyebrow?: string;
  eyebrowColor?: ThemeColor;
  /** Shown to the right of the title, e.g. an icon button. */
  action?: ReactNode;
};

/** The large in-content title every screen starts with. */
export function PageHeader({ title, subtitle, eyebrow, eyebrowColor = 'tint', action }: PageHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        {eyebrow && (
          <ThemedText type="eyebrow" themeColor={eyebrowColor}>
            {eyebrow}
          </ThemedText>
        )}
        <ThemedText type="title" accessibilityRole="header">
          {title}
        </ThemedText>
        {subtitle && <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
});
