import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FocusAreas } from '@/components/focus-areas';
import { PageHeader } from '@/components/page-header';
import { ScrollView } from '@/components/scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimePicker } from '@/components/time-picker';
import { Spacing } from '@/constants/theme';
import { focusAreas, focusTests } from '@/data/mobility-score';
import { FLEXIBILITY_TESTS } from '@/data/mobility-tests';
import { useMobilityScore } from '@/db/mobility-tests';
import { DAILY_MINUTES } from '@/lib/workout';

export default function FocusScreen() {
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState<number | null>(null);
  const score = useMobilityScore();
  const areas = score ? focusAreas(score.areas) : [];
  // The weakest movement in each focus area, which the routine always includes exercises for.
  const tests = score ? focusTests(score.tests, areas) : [];
  const movements = Object.fromEntries(
    FLEXIBILITY_TESTS.filter((test) => tests.includes(test.id)).map((test) => [test.area, test.movement])
  );

  return (
    <ThemedView style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <PageHeader eyebrow="Focus routine" title="How much time do you have?" />
        <TimePicker minutes={minutes} onChange={setMinutes} />
        <View style={styles.section}>
          <ThemedText type="eyebrow" themeColor="textSecondary" accessibilityRole="header">
            Targeted areas
          </ThemedText>
          {score === null ? (
            <Card style={styles.noTest}>
              <ThemedText type="small" themeColor="textSecondary">
                Take a flexibility test to find the areas this routine works on.
              </ThemedText>
              <Button title="Take test" variant="secondary" onPress={() => router.push('/mobility-test')} />
            </Card>
          ) : (
            score && (
              <Card>
                <FocusAreas areas={areas} scores={score.areas} movements={movements} />
              </Card>
            )
          )}
        </View>
        {areas.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Your lowest scoring areas from your last test, with the weakest movement in each. Most exercises work on them,
            with a few others for variety.
          </ThemedText>
        )}
      </ScrollView>

      {/* Always laid out, so picking a time doesn't make the screen jump. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Button
          title={areas.length === 0 ? 'Take a test first' : minutes === null ? 'Pick a time' : `Start ${minutes} min routine`}
          disabled={minutes === null || areas.length === 0}
          onPress={() =>
            router.push({
              pathname: '/workout',
              params: { minutes: minutes ?? DAILY_MINUTES[0], routine: 'focus', areas: areas.join(','), tests: tests.join(',') },
            })
          }
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.three,
    gap: Spacing.four,
  },
  footer: {
    paddingHorizontal: Spacing.screen,
  },
  section: {
    gap: Spacing.two,
  },
  noTest: {
    gap: Spacing.three,
  },
});
