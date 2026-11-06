import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { Button } from '@/components/button';
import { Field, TextField } from '@/components/field';
import { LoginLayout } from '@/components/login-layout';
import { BirthDateField, SexField } from '@/components/profile-fields';
import { ThemedText } from '@/components/themed-text';
import type { Sex } from '@/data/mobility-tests';
import { getProfile, updateProfile } from '@/db/profile';
import { syncDisplayName } from '@/lib/auth';
import { linkDevice, startOffline } from '@/lib/backup';
import type { DateKey } from '@/lib/dates';
import { setGreeting } from '@/lib/greeting';
import { supabase } from '@/lib/supabase';

/**
 * A new user's first screen. Linking comes last, because that's what opens the app: quitting before
 * then leaves nothing in the cloud, so this screen just comes back.
 *
 * `offline` is for someone going without an account: there's no one to sync the name to or link,
 * and `onBack` returns to signing in.
 */
export function CreateProfileForm({ offline = false, onBack }: { offline?: boolean; onBack?: () => void }) {
  const db = useSQLiteContext();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<DateKey | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(undefined);
    try {
      await updateProfile(db, { ...(await getProfile(db)), firstName, lastName, dateOfBirth, sex });
      setGreeting('new');
      if (offline) {
        startOffline();
      } else {
        syncDisplayName({ firstName, lastName });
        linkDevice(db);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setSaving(false);
    }
  };

  return (
    <LoginLayout
      title="Create your profile"
      subtitle="Your age and sex at birth let us compare your test results with people like you.">
      <Field label="First name">
        <TextField
          accessibilityLabel="First name"
          value={firstName}
          onChangeText={setFirstName}
          autoComplete="given-name"
          textContentType="givenName"
          autoCapitalize="words"
          returnKeyType="next"
        />
      </Field>
      <Field label="Last name (optional)">
        <TextField
          accessibilityLabel="Last name"
          value={lastName}
          onChangeText={setLastName}
          autoComplete="family-name"
          textContentType="familyName"
          autoCapitalize="words"
        />
      </Field>
      <BirthDateField value={dateOfBirth} onChange={setDateOfBirth} />
      <SexField value={sex} onChange={setSex} />
      {error && <ThemedText themeColor="danger">{error}</ThemedText>}
      <Button
        title="Continue"
        onPress={save}
        loading={saving}
        disabled={!firstName.trim() || !dateOfBirth || !sex}
      />
      <Button
        title={offline ? 'Back' : 'Use a different email'}
        variant="secondary"
        onPress={offline ? onBack! : () => supabase!.auth.signOut({ scope: 'local' })}
        disabled={saving}
      />
    </LoginLayout>
  );
}
