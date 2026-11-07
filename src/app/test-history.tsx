import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/page-header';
import { TestList } from '@/components/score-history';
import { ScrollView } from '@/components/scroll-view';
import { SectionHeader } from '@/components/section-header';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTestHistory, type PastTest } from '@/db/mobility-tests';

/** Tests by the year they were taken, newest first. */
function byYear(tests: PastTest[]) {
  const years = new Map<string, PastTest[]>();
  for (const test of tests) {
    const year = test.date.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), test]);
  }
  return [...years];
}

/** Every flexibility test taken, to open any of them. */
export default function TestHistoryScreen() {
  const insets = useSafeAreaInsets();
  const history = useTestHistory();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <PageHeader
          eyebrow={history ? `${history.length} ${history.length === 1 ? 'test' : 'tests'}` : undefined}
          title="Test history"
        />
        {history &&
          byYear(history).map(([year, tests]) => (
            <View key={year} style={styles.year}>
              <SectionHeader title={year} />
              <TestList tests={tests} />
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
    gap: Spacing.three,
  },
  year: {
    gap: Spacing.three,
  },
});
