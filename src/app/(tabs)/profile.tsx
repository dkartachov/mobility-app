import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { GoalCard } from '@/components/goal-card';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { deleteGoal, useGoals, type Goal } from '@/db/goals';
import { GENDER_LABELS, useProfile } from '@/db/profile';
import { useStats } from '@/db/sessions';
import { useTheme } from '@/hooks/use-theme';
import { ageFromDateKey, formatDuration } from '@/lib/dates';

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const profile = useProfile();
  const goals = useGoals();
  const stats = useStats();

  if (!profile) return null;

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  const details = [
    profile.dateOfBirth && `${ageFromDateKey(profile.dateOfBirth)} years old`,
    profile.gender && profile.gender !== 'prefer_not_to_say' && GENDER_LABELS[profile.gender],
  ].filter(Boolean);

  const confirmDelete = (goal: Goal) => {
    Alert.alert('Delete goal?', `"${goal.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(db, goal.id) },
    ]);
  };

  return (
    <Screen
      title="Profile"
      headerAction={
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={Spacing.two}
          onPress={() => router.push('/settings')}
          style={[styles.settingsButton, { backgroundColor: theme.backgroundElement }]}>
          <Icon name={{ ios: 'gearshape.fill', android: 'settings' }} size={22} color="textSecondary" />
        </PressableScale>
      }>
      <Card style={styles.profileCard}>
        <View style={[styles.avatarRing, { borderColor: theme.tint }]}>
          <Avatar photoFile={profile.photoFile} initials={initials} />
        </View>
        <View style={styles.profileText}>
          <ThemedText type="subtitle">{fullName || 'Your name'}</ThemedText>
          {details.length > 0 && (
            <ThemedText themeColor="textSecondary">{details.join(' · ')}</ThemedText>
          )}
        </View>

        {stats && (
          <View style={[styles.stats, { borderColor: theme.border }]}>
            <ProfileStat value={String(stats.sessionCount)} label="Sessions" />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <ProfileStat value={formatDuration(stats.totalSeconds)} label="Total time" />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <ProfileStat value={`${stats.longestStreak}d`} label="Best streak" />
          </View>
        )}

        <View style={styles.editButton}>
          <Button title="Edit profile" variant="secondary" onPress={() => router.push('/edit-profile')} />
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Goals" action={{ label: 'New goal', href: '/new-goal' }} />
        {goals?.length === 0 && (
          <ThemedText themeColor="textSecondary">
            Set a goal like &quot;10 hours in 30 days&quot; to track your progress.
          </ThemedText>
        )}
        {goals?.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onDelete={() => confirmDelete(goal)} />
        ))}
        {goals?.length === 0 && <Button title="Add goal" onPress={() => router.push('/new-goal')} />}
      </View>
    </Screen>
  );
}

function ProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="subtitle" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  avatarRing: {
    padding: Spacing.one,
    borderRadius: 999,
    borderWidth: 2,
  },
  profileText: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.one,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  editButton: {
    alignSelf: 'stretch',
  },
  section: {
    gap: Spacing.three,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
