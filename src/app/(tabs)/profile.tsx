import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { GoalCard } from '@/components/goal-card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { deleteGoal, useGoals, type Goal } from '@/db/goals';
import { GENDER_LABELS, useProfile } from '@/db/profile';
import { ageFromDateKey } from '@/lib/dates';

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const profile = useProfile();
  const goals = useGoals();

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={Spacing.three}
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
          <Icon name={{ ios: 'gearshape', android: 'settings' }} size={24} color="textSecondary" />
        </Pressable>
      }>
      <Card style={styles.profileCard}>
        <Avatar photoFile={profile.photoFile} initials={initials} />
        <View style={styles.profileText}>
          <ThemedText type="subtitle">{fullName || 'Your name'}</ThemedText>
          {details.length > 0 && (
            <ThemedText themeColor="textSecondary">{details.join(' · ')}</ThemedText>
          )}
        </View>
        <Button title="Edit profile" variant="secondary" onPress={() => router.push('/edit-profile')} />
      </Card>

      <View style={styles.section}>
        <ThemedText type="subtitle">Goals</ThemedText>
        {goals?.length === 0 && (
          <ThemedText themeColor="textSecondary">
            Set a goal like &quot;10 hours in 30 days&quot; to track your progress.
          </ThemedText>
        )}
        {goals?.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onDelete={() => confirmDelete(goal)} />
        ))}
        <Button title="Add goal" onPress={() => router.push('/new-goal')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  profileText: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  section: {
    gap: Spacing.three,
  },
  settingsButton: {
    paddingTop: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
