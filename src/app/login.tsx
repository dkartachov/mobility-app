import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { LinkDevice } from '@/components/link-device';
import { PageHeader } from '@/components/page-header';
import { ScrollView } from '@/components/scroll-view';
import { SignInForm } from '@/components/sign-in-form';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuthState } from '@/lib/auth';

/**
 * Shown instead of the app until this phone is signed in and linked to its backup, so nothing can
 * be recorded that restoring a backup would then wipe. See the root layout.
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signedIn } = useAuthState();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four },
        ]}>
        <PageHeader title="Welcome" subtitle="Sign in to start, or to pick up where you left off." />
        <Card style={styles.card}>{signedIn ? <LinkDevice /> : <SignInForm />}</Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  card: {
    gap: Spacing.three,
  },
});
