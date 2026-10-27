import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { StackHeader } from '@/components/stack-header';
import { Colors } from '@/constants/theme';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';
import { applySavedThemePreference, useColorScheme } from '@/lib/theme-preference';

applySavedThemePreference();

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

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

  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onInit={migrateDbIfNeeded}
      options={{ enableChangeListener: true }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ header: (props) => <StackHeader {...props} /> }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="daily" options={{ title: 'Daily' }} />
          <Stack.Screen name="workout" options={{ title: '' }} />
          <Stack.Screen name="library" options={{ title: 'Library' }} />
          <Stack.Screen name="mobility-time" options={{ title: 'Mobility time' }} />
          <Stack.Screen name="mobility-score" options={{ title: 'Mobility score' }} />
          <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="edit-profile" options={{ title: 'Edit profile', presentation: 'modal' }} />
          <Stack.Screen name="new-goal" options={{ title: 'New goal', presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
