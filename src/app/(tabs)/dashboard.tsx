import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { GoalCard } from '@/components/goal-card';
import { Icon } from '@/components/icon';
import { MilestoneBar } from '@/components/milestone-bar';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useGoals } from '@/db/goals';
import { useTestSchedule } from '@/db/mobility-tests';
import { useProfile } from '@/db/profile';
import { useStats } from '@/db/sessions';
import { formatDuration } from '@/lib/dates';

function days(n: number) {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

export default function DashboardScreen() {
  const stats = useStats();
  const goals = useGoals();
  const profile = useProfile();
  const testSchedule = useTestSchedule();
  const activeGoals = goals?.filter((goal) => goal.status === 'active') ?? [];

  if (!stats) return null;

  const streakHint = stats.trainedToday
    ? 'You trained today. Nice work!'
    : stats.currentStreak > 0
      ? 'Train today to keep your streak going.'
      : 'Complete a session to start a streak.';

  const testHint = !testSchedule
    ? undefined
    : !testSchedule.lastTestDate
      ? 'Take your first flexibility test to get a score.'
      : testSchedule.isDue
        ? "It's test day! Tap to retake your flexibility test."
        : `Next test in ${days(testSchedule.daysUntilNext)}`;

  return (
    <Screen title="Dashboard" subtitle={profile?.firstName ? `Hi, ${profile.firstName}` : undefined}>
      <Card style={styles.streakCard}>
        <Icon
          name={{ ios: 'flame.fill', android: 'local_fire_department' }}
          color={stats.currentStreak > 0 ? 'streak' : 'textSecondary'}
          size={40}
        />
        <View style={styles.streakText}>
          <ThemedText type="stat">{days(stats.currentStreak)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Current streak · Best {days(stats.longestStreak)}
          </ThemedText>
          <ThemedText type="small">{streakHint}</ThemedText>
        </View>
      </Card>

      <View style={styles.statRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mobility time, ${formatDuration(stats.totalSeconds)}`}
          onPress={() => router.push('/mobility-time')}
          style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}>
          <Card style={styles.statCardFill}>
            <ThemedText type="small" themeColor="textSecondary">
              Mobility time
            </ThemedText>
            <ThemedText type="stat">{formatDuration(stats.totalSeconds)}</ThemedText>
            <MilestoneBar totalSeconds={stats.totalSeconds} />
          </Card>
        </Pressable>
        <Card style={styles.statCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Sessions
          </ThemedText>
          <ThemedText type="stat">{stats.sessionCount}</ThemedText>
        </Card>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Mobility score. ${testHint ?? ''}`}
        onPress={() => router.push('/mobility-score')}
        style={({ pressed }) => pressed && styles.pressed}>
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Mobility score
          </ThemedText>
          <ThemedText type="stat" themeColor="textSecondary">
            —
          </ThemedText>
          {testHint && (
            <ThemedText type="small" themeColor={testSchedule?.isDue ? 'tint' : 'textSecondary'}>
              {testHint}
            </ThemedText>
          )}
        </Card>
      </Pressable>

      <View style={styles.section}>
        <ThemedText type="subtitle">Active goals</ThemedText>
        {activeGoals.length > 0 ? (
          activeGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
        ) : (
          <ThemedText themeColor="textSecondary">
            No active goals.{' '}
            <Link href="/new-goal">
              <ThemedText themeColor="tint">Set one</ThemedText>
            </Link>
          </ThemedText>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  streakText: {
    flex: 1,
    gap: Spacing.half,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statCard: {
    flex: 1,
  },
  statCardFill: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    gap: Spacing.three,
  },
});
