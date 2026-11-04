import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { MilestoneBadges } from '@/components/milestone-badges';
import { MilestoneRing } from '@/components/milestone-ring';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { SEX_LABELS, useProfile } from '@/db/profile';
import { useStats } from '@/db/sessions';
import { useTheme } from '@/hooks/use-theme';
import { ageFromDateKey, formatDateKey, formatDuration } from '@/lib/dates';

const AVATAR_SIZE = 96;
/** The milestone ring sits this far outside the avatar. */
const RING_GAP = Spacing.one + Spacing.half;
const RING_THICKNESS = 3;
/** Lets the tab finish appearing before the ring fills. */
const ANIMATION_DELAY_MS = 200;

export default function ProfileScreen() {
  const theme = useTheme();
  const profile = useProfile();
  const stats = useStats();

  // Native tabs all mount when the app loads, so the ring waits for this tab to be opened to fill.
  const [opened, setOpened] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setOpened(true);
    }, [])
  );

  if (!profile) return null;

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  const details = [
    profile.dateOfBirth && `${ageFromDateKey(profile.dateOfBirth)} years old`,
    profile.sex && SEX_LABELS[profile.sex],
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
        <MilestoneRing
          totalSeconds={stats?.totalSeconds ?? 0}
          size={AVATAR_SIZE + (RING_GAP + RING_THICKNESS) * 2}
          thickness={RING_THICKNESS}
          play={opened && stats !== undefined}
          delayMs={ANIMATION_DELAY_MS}>
          <Avatar photoFile={profile.photoFile} initials={initials} size={AVATAR_SIZE} />
        </MilestoneRing>
        <View style={styles.profileText}>
          <ThemedText type="subtitle">{fullName || 'Your name'}</ThemedText>
          {details.length > 0 && <ThemedText themeColor="textSecondary">{details.join(' · ')}</ThemedText>}
          {stats?.firstSessionDate && (
            <ThemedText type="small" themeColor="textSecondary">
              Training since {formatDateKey(stats.firstSessionDate)}
            </ThemedText>
          )}
        </View>

        <View style={styles.editButton}>
          <Button title="Edit profile" variant="secondary" onPress={() => router.push('/edit-profile')} />
        </View>
      </Card>

      {stats && (
        <Card style={styles.statsCard}>
          <Stat value={formatDuration(stats.totalSeconds)} label="Mobility time" />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Stat value={String(stats.sessionCount)} label={stats.sessionCount === 1 ? 'Session' : 'Sessions'} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Stat value={String(stats.trainedDayCount)} label={stats.trainedDayCount === 1 ? 'Day trained' : 'Days trained'} />
        </Card>
      )}

      {stats && (
        <View style={styles.milestones}>
          <SectionHeader title="Milestones" action={{ label: 'See all', href: '/mobility-time' }} />
          <MilestoneBadges totalSeconds={stats.totalSeconds} />
        </View>
      )}
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.stat}>
      <ThemedText type="subtitle" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} adjustsFontSizeToFit>
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
  profileText: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  editButton: {
    alignSelf: 'stretch',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  milestones: {
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
