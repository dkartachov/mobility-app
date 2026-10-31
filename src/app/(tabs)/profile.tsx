import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { GENDER_LABELS, useProfile } from '@/db/profile';
import { useTheme } from '@/hooks/use-theme';
import { ageFromDateKey } from '@/lib/dates';

export default function ProfileScreen() {
  const theme = useTheme();
  const profile = useProfile();

  if (!profile) return null;

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  const details = [
    profile.dateOfBirth && `${ageFromDateKey(profile.dateOfBirth)} years old`,
    profile.gender && profile.gender !== 'prefer_not_to_say' && GENDER_LABELS[profile.gender],
  ].filter(Boolean);

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

        <View style={styles.editButton}>
          <Button title="Edit profile" variant="secondary" onPress={() => router.push('/edit-profile')} />
        </View>
      </Card>
    </Screen>
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
  editButton: {
    alignSelf: 'stretch',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
