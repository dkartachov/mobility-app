import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { useProfile, type Profile } from '@/db/profile';
import { useTheme } from '@/hooks/use-theme';
import { syncDisplayName } from '@/lib/auth';
import { clearGreeting, type Greeting } from '@/lib/greeting';
import { profilePhotoUri } from '@/lib/profile-photo';

import { Avatar } from './avatar';
import { ThemedText } from './themed-text';

const FADE_IN_MS = 600;
const HOLD_MS = 2000;
const FADE_OUT_MS = 400;

/**
 * Shown once after signing in, covering the app as it opens underneath, so it can fade out onto
 * the app on both platforms.
 */
export function WelcomeOverlay({ greeting }: { greeting: Greeting }) {
  const theme = useTheme();
  const profile = useProfile();

  return (
    <Animated.View
      accessibilityViewIsModal
      exiting={FadeOut.duration(FADE_OUT_MS)}
      style={[StyleSheet.absoluteFill, styles.screen, { backgroundColor: theme.background }]}>
      {profile && <Welcome profile={profile} returning={greeting === 'returning'} />}
    </Animated.View>
  );
}

function Welcome({ profile, returning }: { profile: Profile; returning: boolean }) {
  const { firstName, lastName, photoFile } = profile;

  useEffect(() => {
    const timer = setTimeout(clearGreeting, FADE_IN_MS + HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  // Accounts from before names were synced get theirs here. A new user's was just saved.
  useEffect(() => {
    if (returning) syncDisplayName({ firstName, lastName });
  }, [returning, firstName, lastName]);

  const words = returning ? 'Welcome back' : 'Welcome';
  const hasPhoto = returning && profilePhotoUri(photoFile) !== null;

  return (
    <Animated.View entering={FadeInDown.duration(FADE_IN_MS)} style={styles.content}>
      {hasPhoto && <Avatar photoFile={photoFile} initials="" size={112} />}
      <ThemedText type="title" style={styles.text}>
        {firstName ? `${words}, ${firstName}` : words}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  content: {
    alignItems: 'center',
    gap: Spacing.four,
  },
  text: {
    textAlign: 'center',
  },
});
