import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { GoalCard } from '@/components/goal-card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useGoals } from '@/db/goals';
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
  const activeGoals = goals?.filter((goal) => goal.status === 'active') ?? [];

  if (!stats) return null;

  const streakHint = stats.trainedToday
    ? 'You trained today. Nice work!'
    : stats.currentStreak > 0
      ? 'Train today to keep your streak going.'
      : 'Complete a session to start a streak.';

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
        <Card style={styles.statCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Mobility time
          </ThemedText>
          <ThemedText type="stat">{formatDuration(stats.totalSeconds)}</ThemedText>
        </Card>
        <Card style={styles.statCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Sessions
          </ThemedText>
          <ThemedText type="stat">{stats.sessionCount}</ThemedText>
        </Card>
      </View>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Mobility score
        </ThemedText>
        <ThemedText type="stat" themeColor="textSecondary">
          —
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Coming soon
        </ThemedText>
      </Card>

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
  section: {
    gap: Spacing.three,
  },
});
