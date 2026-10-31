import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { MilestoneBadges } from '@/components/milestone-badges';
import { MilestoneBar } from '@/components/milestone-bar';
import { PageHeader } from '@/components/page-header';
import { ScrollView } from '@/components/scroll-view';
import { SectionHeader } from '@/components/section-header';
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
        <PageHeader
          eyebrow={stats?.firstSessionDate ? `Since ${formatDateKey(stats.firstSessionDate)}` : undefined}
          title="Mobility time"
        />
        {stats && (
          <Card style={styles.card}>
            <View style={styles.header}>
              <IconBadge name={{ ios: 'clock.fill', android: 'schedule' }} size={44} />
              <View style={styles.headerText}>
                <ThemedText type="eyebrow" themeColor="textSecondary">
                  Total mobility time
                </ThemedText>
                <ThemedText type="stat">{formatDuration(stats.totalSeconds)}</ThemedText>
              </View>
            </View>
            {!stats.firstSessionDate && (
              <ThemedText type="small" themeColor="textSecondary">
                Complete a session to get started
              </ThemedText>
            )}
            <MilestoneBar
              totalSeconds={stats.totalSeconds}
              animateFromSeconds={milestoneProgress(stats.totalSeconds).previousHours * 3600}
              delayMs={FILL_DELAY_MS}
            />
          </Card>
        )}
        {stats && (
          <View style={styles.milestones}>
            <View>
              <SectionHeader title="Milestones" />
              <ThemedText type="small" themeColor="textSecondary">
                Hours of total mobility time
              </ThemedText>
            </View>
            <MilestoneBadges totalSeconds={stats.totalSeconds} />
          </View>
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
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.four - Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
  },
  milestones: {
    gap: Spacing.three,
  },
});
