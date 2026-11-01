import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AutoBackup } from '@/components/auto-backup';
import { DialogHost } from '@/components/dialog';
import { ReminderScheduler } from '@/components/reminder-scheduler';
import { StackHeader } from '@/components/stack-header';
import { Colors } from '@/constants/theme';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';
import { useAuthState } from '@/lib/auth';
import { isBackupConfigured, useBackupState } from '@/lib/backup';
import { applySavedThemePreference, useColorScheme } from '@/lib/theme-preference';

applySavedThemePreference();

// Kept up until the saved session is read, so the login screen doesn't flash on every launch.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const { signedIn } = useAuthState();
  const { linked } = useBackupState();

  // Builds without backups (Expo Go, no Supabase settings) have nothing to sign in to.
  const sessionKnown = !isBackupConfigured || signedIn !== undefined;
  // Linked means restored or backing up, so nothing recorded from here on can be lost to a restore.
  const unlocked = !isBackupConfigured || (signedIn === true && linked);

  useEffect(() => {
    if (sessionKnown) SplashScreen.hide();
  }, [sessionKnown]);

  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  if (!sessionKnown) return null;

  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onInit={migrateDbIfNeeded}
      options={{ enableChangeListener: true }}>
      <AutoBackup />
      <ReminderScheduler />
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ header: (props) => <StackHeader {...props} /> }}>
          <Stack.Protected guard={!unlocked}>
            <Stack.Screen name="login" options={{ headerShown: false }} />
          </Stack.Protected>
          {/* Routes not listed here are reachable while locked, so every new screen goes in. */}
          <Stack.Protected guard={unlocked}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="daily" />
            <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
            <Stack.Screen name="exercise/[id]" />
            <Stack.Screen name="library" />
            <Stack.Screen name="mobility-score" />
            <Stack.Screen name="mobility-test" />
            <Stack.Screen name="mobility-time" />
            <Stack.Screen name="new-goal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" />
            <Stack.Screen name="training-days" />
            <Stack.Screen name="workout" />
          </Stack.Protected>
        </Stack>
        <DialogHost />
      </ThemeProvider>
    </SQLiteProvider>
  );
}
