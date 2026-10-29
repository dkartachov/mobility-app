import { Link, router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/card';
import { GoalCard } from '@/components/goal-card';
import { Icon } from '@/components/icon';
import { IconBadge } from '@/components/icon-badge';
import { MilestoneBar } from '@/components/milestone-bar';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { ScoreRing } from '@/components/score-ring';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { WeekStrip } from '@/components/week-strip';
import { Radius, Spacing } from '@/constants/theme';
import { formatScoreChange, scoreChange } from '@/data/mobility-score';
import { useGoals } from '@/db/goals';
import { useMobilityScore, useTestSchedule } from '@/db/mobility-tests';
import { useProfile } from '@/db/profile';
import { useRecentDays, useStats } from '@/db/sessions';
import { formatDuration } from '@/lib/dates';
import { useTheme } from '@/hooks/use-theme';

function days(n: number) {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const stats = useStats();
  const recentDays = useRecentDays();
  const goals = useGoals();
  const profile = useProfile();
  const testSchedule = useTestSchedule();
  const score = useMobilityScore();
  const activeGoals = goals?.filter((goal) => goal.status === 'active') ?? [];
  const scoreDelta = score ? scoreChange(score.overall, score.previous?.overall) : null;

  if (!stats) return null;

  const streaking = stats.currentStreak > 0;
  const streakHint = stats.trainedToday
    ? 'You trained today. Nice work!'
    : streaking
      ? 'Train today to keep your streak going.'
      : 'Complete a session to start a streak.';

  // Short enough to fit under the ring in a half-width tile.
  const testHint = !testSchedule
    ? undefined
    : !testSchedule.lastTestDate
      ? 'Take your first test'
      : testSchedule.isDue
        ? "It's test day!"
        : `Next test in ${days(testSchedule.daysUntilNext)}`;

  return (
    <Screen
      eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
      title={profile?.firstName ? `Hi, ${profile.firstName}` : 'Dashboard'}
      gap={Spacing.three}>
      <Card style={[styles.streakCard, { backgroundColor: streaking ? theme.streakSoft : theme.backgroundElement }]}>
        <View style={styles.streakHeader}>
          <IconBadge
            name={{ ios: 'flame.fill', android: 'local_fire_department' }}
            color={streaking ? 'streak' : 'textSecondary'}
            background={streaking ? 'backgroundElement' : 'backgroundSelected'}
            size={52}
          />
          <View style={styles.streakText}>
            <View style={styles.streakNumber}>
              <ThemedText type="stat" style={styles.bigStat}>
                {stats.currentStreak}
              </ThemedText>
              <ThemedText type="smallBold" themeColor="textSecondary">
                day streak
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {streakHint}
            </ThemedText>
          </View>
          <View style={styles.best}>
            <ThemedText type="eyebrow" themeColor="textSecondary">
              Best
            </ThemedText>
            <ThemedText type="smallBold">{days(stats.longestStreak)}</ThemedText>
          </View>
        </View>
        {recentDays && (
          <WeekStrip days={recentDays} emptyColor={streaking ? 'backgroundElement' : 'backgroundSelected'} />
        )}
      </Card>

      {/* Time is a short, wide card; score sits beside it as a tall rectangle. */}
      <View style={styles.tileRow}>
        <DashboardTile
          label="Mobility time"
          accessibilityLabel={`Mobility time, ${formatDuration(stats.totalSeconds)}`}
          onPress={() => router.push('/mobility-time')}
          style={styles.timeTile}>
          <View style={styles.timeBody}>
            <ThemedText type="stat" numberOfLines={1} adjustsFontSizeToFit>
              {formatDuration(stats.totalSeconds)}
            </ThemedText>
          </View>
          <MilestoneBar totalSeconds={stats.totalSeconds} />
        </DashboardTile>

        <DashboardTile
          label="Score"
          accessibilityLabel={`Mobility score${score?.overall == null ? '' : ` ${Math.round(score.overall)}`}. ${testHint ?? ''}`}
          onPress={() => router.push('/mobility-score')}
          style={styles.scoreTile}>
          <View style={styles.scoreBody}>
            <ScoreRing score={score?.overall ?? null} size={104} thickness={10} />
            {scoreDelta !== null && (
              <View
                style={[styles.delta, { backgroundColor: scoreDelta < 0 ? `${theme.danger}1F` : theme.tintSoft }]}>
                <ThemedText
                  type="smallBold"
                  themeColor={scoreDelta > 0 ? 'tint' : scoreDelta < 0 ? 'danger' : 'textSecondary'}>
                  {formatScoreChange(scoreDelta)}
                </ThemedText>
              </View>
            )}
          </View>
          {testHint && (
            <ThemedText
              type="smallBold"
              themeColor={testSchedule?.isDue ? 'tint' : 'textSecondary'}
              numberOfLines={2}
              style={styles.centered}>
              {testHint}
            </ThemedText>
          )}
        </DashboardTile>
      </View>

      <SectionHeader title="Active goals" action={{ label: 'New goal', href: '/new-goal' }} />
      {activeGoals.length > 0 ? (
        activeGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
      ) : (
        <Link href="/new-goal" asChild>
          <PressableScale accessibilityRole="button">
            <Card style={styles.emptyGoal}>
              <IconBadge name={{ ios: 'flag.fill', android: 'flag' }} />
              <View style={styles.emptyGoalText}>
                <ThemedText type="smallBold">No active goals</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Set one like &quot;10 hours in 30 days&quot;.
                </ThemedText>
              </View>
              <Icon name={{ ios: 'plus', android: 'add' }} color="tint" size={20} />
            </Card>
          </PressableScale>
        </Link>
      )}
    </Screen>
  );
}

type DashboardTileProps = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  /** Sets the tile's share of the row, e.g. `flex: 3`. */
  style: StyleProp<ViewStyle>;
  /** The main visual, then a footer. The tile is as tall as its content. */
  children: ReactNode;
};

/** Tappable card with a label and chevron along the top. */
function DashboardTile({ label, accessibilityLabel, onPress, style, children }: DashboardTileProps) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={style}>
      <Card style={styles.tileCard}>
        <View style={styles.tileHeader}>
          <ThemedText type="eyebrow" themeColor="textSecondary" numberOfLines={1} style={styles.tileLabel}>
            {label}
          </ThemedText>
          <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} color="textSecondary" size={14} />
        </View>
        {children}
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  streakCard: {
    gap: Spacing.four - Spacing.one,
    padding: Spacing.four - Spacing.one,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  streakText: {
    flex: 1,
  },
  streakNumber: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one + Spacing.half,
  },
  bigStat: {
    fontSize: 40,
    lineHeight: 46,
  },
  best: {
    alignItems: 'flex-end',
    alignSelf: 'flex-start',
  },
  // Top-aligned so each tile keeps its own height: score stays tall, time stays short.
  tileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  scoreTile: {
    flex: 3,
  },
  timeTile: {
    flex: 4,
  },
  tileCard: {
    gap: Spacing.three,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tileLabel: {
    flex: 1,
  },
  scoreBody: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  delta: {
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.half,
    borderRadius: Radius.full,
  },
  centered: {
    textAlign: 'center',
  },
  timeBody: {
    gap: Spacing.two,
  },
  emptyGoalText: {
    flex: 1,
    gap: Spacing.half,
  },
  emptyGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
