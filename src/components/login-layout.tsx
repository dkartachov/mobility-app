import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

import { Card } from './card';
import { PageHeader } from './page-header';
import { ScrollView } from './scroll-view';
import { ThemedView } from './themed-view';

type LoginLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** A full screen with a title and one card, for every step of signing in that asks for something. */
export function LoginLayout({ title, subtitle, children }: LoginLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four },
        ]}>
        <PageHeader title={title} subtitle={subtitle} />
        <Card style={styles.card}>{children}</Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  card: {
    gap: Spacing.three,
  },
});
