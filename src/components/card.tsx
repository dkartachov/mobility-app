import { StyleSheet, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';

import { ThemedView } from './themed-view';

export function Card({ style, ...props }: ViewProps) {
  return <ThemedView type="backgroundElement" style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
