import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { GoalCard } from '@/components/goal-card';
import { Icon } from '@/components/icon';
import { MilestoneBar } from '@/components/milestone-bar';
import { Screen } from '@/components/screen';
import { ScoreRing } from '@/components/score-ring';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useGoals } from '@/db/goals';
import { useMobilityScore, useTestSchedule } from '@/db/mobility-tests';
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
  const score = useMobilityScore();
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
    <Screen
      title="Dashboard"
      subtitle={profile?.firstName ? `Hi, ${profile.firstName}` : undefined}
      gap={Spacing.three}>
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
          style={({ pressed }) => [styles.timeCard, pressed && styles.pressed]}>
          <Card style={styles.fill}>
            <ThemedText type="small" themeColor="textSecondary">
              Mobility time
            </ThemedText>
            <ThemedText type="stat" numberOfLines={1} adjustsFontSizeToFit>
              {formatDuration(stats.totalSeconds)}
            </ThemedText>
            <MilestoneBar totalSeconds={stats.totalSeconds} />
          </Card>
        </Pressable>
        <Card style={styles.sessionsCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Sessions
          </ThemedText>
          <ThemedText type="stat" numberOfLines={1} adjustsFontSizeToFit>
            {stats.sessionCount}
          </ThemedText>
        </Card>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Mobility score${score?.overall == null ? '' : ` ${Math.round(score.overall)}`}. ${testHint ?? ''}`}
        onPress={() => router.push('/mobility-score')}
        style={({ pressed }) => pressed && styles.pressed}>
        <Card style={styles.scoreCard}>
          <View style={styles.scoreText}>
            <ThemedText type="small" themeColor="textSecondary">
              Mobility score
            </ThemedText>
            {testHint && (
              <ThemedText type="small" themeColor={testSchedule?.isDue ? 'tint' : 'textSecondary'}>
                {testHint}
              </ThemedText>
            )}
          </View>
          <ScoreRing score={score?.overall ?? null} size={88} thickness={8} />
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
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  scoreText: {
    flex: 1,
    gap: Spacing.half,
  },
  streakText: {
    flex: 1,
    gap: Spacing.half,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  timeCard: {
    flex: 2,
  },
  sessionsCard: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
