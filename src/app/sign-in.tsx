import { router } from 'expo-router';
import { useEffect } from 'react';

import { LinkDevice } from '@/components/link-device';
import { LoginLayout } from '@/components/login-layout';
import { SignInForm } from '@/components/sign-in-form';
import { useAuthState } from '@/lib/auth';
import { useBackupState } from '@/lib/backup';

/**
 * Signing in from Settings, for a phone that started offline. Like the login screen, it ends by
 * linking the phone, which closes this screen.
 */
export default function SignInScreen() {
  const { signedIn } = useAuthState();
  const { linked } = useBackupState();

  useEffect(() => {
    if (linked) router.back();
  }, [linked]);

  if (signedIn) return <LinkDevice />;

  return (
    <LoginLayout title="Back up your data" subtitle="Sign in to keep your data safe in the cloud." underHeader>
      <SignInForm />
    </LoginLayout>
  );
}
