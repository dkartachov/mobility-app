import { Href, Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';

type SectionHeaderProps = {
  title: string;
  /** Optional link on the right, e.g. "Add". */
  action?: { label: string; href: Href };
};

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <ThemedText type="subtitle" accessibilityRole="header">
        {title}
      </ThemedText>
      {action && (
        <Link href={action.href}>
          <ThemedText type="smallBold" themeColor="tint">
            {action.label}
          </ThemedText>
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
});
