import { useState } from 'react';

import { Button } from '@/components/button';
import { Field, TextField } from '@/components/field';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

/**
 * Email and a one-time code, no password. A new email gets a new user and an existing one signs
 * back in, so the same email on a new phone reaches the same backups.
 */
export function SignInForm() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const run = async (action: () => Promise<{ error: { message: string } | null }>) => {
    setLoading(true);
    setError(undefined);
    const result = await action();
    setLoading(false);
    if (result.error) setError(result.error.message);
    return !result.error;
  };

  const sendCode = async (address: string) => {
    if (await run(() => supabase!.auth.signInWithOtp({ email: address }))) {
      setSentTo(address);
      setCode('');
    }
  };

  const verify = () => run(() => supabase!.auth.verifyOtp({ email: sentTo!, token: code.trim(), type: 'email' }));

  if (sentTo === undefined) {
    return (
      <>
        <ThemedText themeColor="textSecondary">
          We&apos;ll send a one-time code to the address you enter.
        </ThemedText>
        <Field label="Email">
          <TextField
            accessibilityLabel="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
        </Field>
        {error && <ThemedText themeColor="danger">{error}</ThemedText>}
        <Button title="Send code" onPress={() => sendCode(email.trim())} loading={loading} disabled={!email.trim()} />
      </>
    );
  }

  return (
    <>
      <ThemedText themeColor="textSecondary">Enter the code we sent to {sentTo}.</ThemedText>
      <Field label="Code">
        <TextField
          accessibilityLabel="Code"
          value={code}
          onChangeText={setCode}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          keyboardType="number-pad"
        />
      </Field>
      {error && <ThemedText themeColor="danger">{error}</ThemedText>}
      <Button title="Confirm" onPress={verify} loading={loading} disabled={!code.trim()} />
      <Button title="Send a new code" variant="secondary" onPress={() => sendCode(sentTo)} disabled={loading} />
      <Button title="Use a different email" variant="secondary" onPress={() => setSentTo(undefined)} disabled={loading} />
    </>
  );
}
