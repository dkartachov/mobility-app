import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { MilestoneBar } from '@/components/milestone-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useStats } from '@/db/sessions';
import { formatDateKey, formatDuration } from '@/lib/dates';
import { milestoneProgress } from '@/lib/milestones';

/** Waits for the push transition to finish so the fill is actually seen. */
const FILL_DELAY_MS = 400;

export default function MobilityTimeScreen() {
  const insets = useSafeAreaInsets();
  const stats = useStats();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <ThemedText type="title" accessibilityRole="header">
          Mobility time
        </ThemedText>
        {stats && (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              Total mobility time
            </ThemedText>
            <ThemedText type="stat">{formatDuration(stats.totalSeconds)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {stats.firstSessionDate
                ? `Started ${formatDateKey(stats.firstSessionDate)}`
                : 'Complete a session to get started'}
            </ThemedText>
            <View style={styles.milestone}>
              <MilestoneBar
                totalSeconds={stats.totalSeconds}
                animateFromSeconds={milestoneProgress(stats.totalSeconds).previousHours * 3600}
                delayMs={FILL_DELAY_MS}
              />
            </View>
          </Card>
        )}
        {/* Graph goes here. */}
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
  milestone: {
    marginTop: Spacing.two,
  },
});
