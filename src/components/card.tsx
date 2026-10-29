import { StyleSheet, type ViewProps } from 'react-native';

import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/lib/theme-preference';

import { ThemedView } from './themed-view';

export function Card({ style, ...props }: ViewProps) {
  const scheme = useColorScheme();
  return <ThemedView type="backgroundElement" style={[styles.card, Elevation[scheme], style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
