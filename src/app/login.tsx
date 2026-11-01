import { LinkDevice } from '@/components/link-device';
import { LoginLayout } from '@/components/login-layout';
import { SignInForm } from '@/components/sign-in-form';
import { useAuthState } from '@/lib/auth';

/**
 * Shown instead of the app until this phone is signed in and linked to its backup, so nothing can
 * be recorded that restoring a backup would then wipe. See the root layout.
 */
export default function LoginScreen() {
  const { signedIn } = useAuthState();

  if (signedIn) return <LinkDevice />;

  return (
    <LoginLayout title="Welcome" subtitle="Sign in to start, or to pick up where you left off.">
      <SignInForm />
    </LoginLayout>
  );
}
