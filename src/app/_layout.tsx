import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: { ...baseTheme.colors, primary: colors.tint, background: colors.background },
  };

  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onInit={migrateDbIfNeeded}
      options={{ enableChangeListener: true }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerTintColor: colors.tint }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="library" options={{ title: 'Library' }} />
          <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
          <Stack.Screen name="edit-profile" options={{ title: 'Edit profile', presentation: 'modal' }} />
          <Stack.Screen name="new-goal" options={{ title: 'New goal', presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
