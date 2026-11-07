import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/page-header';
import { ScrollView } from '@/components/scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { SCORE_EXPLANATION } from '@/data/mobility-score';

export default function ScoreInfoScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <PageHeader title="How your score works" />
        {SCORE_EXPLANATION.map((section) => (
          <View key={section.heading} style={styles.section}>
            <ThemedText type="smallBold" accessibilityRole="header">
              {section.heading}
            </ThemedText>
            {section.paragraphs.map((paragraph) => (
              <ThemedText key={paragraph}>{paragraph}</ThemedText>
            ))}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
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
  section: {
    gap: Spacing.two,
  },
});
