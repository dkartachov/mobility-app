import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { CreateProfileForm } from '@/components/create-profile-form';
import { showDialog } from '@/components/dialog';
import { Icon } from '@/components/icon';
import { LinkDevice } from '@/components/link-device';
import { LoginLayout } from '@/components/login-layout';
import { PressableScale } from '@/components/pressable-scale';
import { SignInForm } from '@/components/sign-in-form';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuthState } from '@/lib/auth';

function showOfflineInfo() {
  showDialog({
    title: 'Without an account',
    message:
      "Your data stays on this phone and isn't backed up, so it's lost if you uninstall the app or lose the phone. Signing in later from Settings starts backing it up.",
  });
}

/**
 * Shown instead of the app until this phone is signed in and linked to its backup, so nothing can
 * be recorded that restoring a backup would then wipe. Or until the user chooses to go without an
 * account, whose data signing in later asks about. See the root layout.
 */
export default function LoginScreen() {
  const { signedIn } = useAuthState();
  const [offline, setOffline] = useState(false);

  if (signedIn) return <LinkDevice />;

  if (offline) return <CreateProfileForm offline onBack={() => setOffline(false)} />;

  return (
    <LoginLayout
      title="Welcome"
      subtitle="Sign in to start, or to pick up where you left off."
      footer={
        <>
          <View style={styles.note}>
            <ThemedText themeColor="textSecondary" style={styles.noteText}>
              You can sign in later from Settings.
            </ThemedText>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="About going without an account"
              hitSlop={Spacing.two}
              onPress={showOfflineInfo}>
              <Icon name={{ ios: 'info.circle', android: 'info' }} size={24} color="textSecondary" />
            </PressableScale>
          </View>
          <Button title="Continue without an account" variant="secondary" onPress={() => setOffline(true)} />
        </>
      }>
      <SignInForm />
    </LoginLayout>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  noteText: {
    flex: 1,
  },
});
