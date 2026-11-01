import { act, render, screen } from '@testing-library/react-native';

import RootLayout from '@/app/_layout';
import { clearGreeting, setGreeting } from '@/lib/greeting';

const mockBackup = { linked: true, listeners: new Set<() => void>() };

function setLinked(linked: boolean) {
  mockBackup.linked = linked;
  mockBackup.listeners.forEach((listener) => listener());
}

// The real provider's comparison, which ignores `children`: this is what the test is about. Whatever
// the layout passes it stops updating once mounted, so state has to be read underneath it.
jest.mock('expo-sqlite', () => {
  const { memo } = jest.requireActual('react');
  return {
    SQLiteProvider: memo(
      ({ children }: { children: unknown }) => children,
      (prev: { databaseName: string; onInit: unknown }, next: { databaseName: string; onInit: unknown }) =>
        prev.databaseName === next.databaseName && prev.onInit === next.onInit
    ),
  };
});
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  const Stack = ({ children }: { children: unknown }) => children;
  function Protected({ guard, children }: { guard: boolean; children: unknown }) {
    return guard ? children : null;
  }
  function Screen({ name }: { name: string }) {
    return <Text>Route: {name}</Text>;
  }
  Stack.Protected = Protected;
  Stack.Screen = Screen;
  const theme = { colors: {} };
  return { Stack, DarkTheme: theme, DefaultTheme: theme, ThemeProvider: ({ children }: { children: unknown }) => children };
});
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hide: jest.fn() }));
jest.mock('@/components/auto-backup', () => ({ AutoBackup: () => null }));
jest.mock('@/components/dialog', () => ({ DialogHost: () => null }));
jest.mock('@/components/reminder-scheduler', () => ({ ReminderScheduler: () => null }));
jest.mock('@/components/stack-header', () => ({ StackHeader: () => null }));
jest.mock('@/components/welcome-overlay', () => {
  const { Text } = jest.requireActual('react-native');
  return { WelcomeOverlay: ({ greeting }: { greeting: string }) => <Text>Greeting: {greeting}</Text> };
});
jest.mock('@/db/schema', () => ({ DATABASE_NAME: 'test.db', migrateDbIfNeeded: jest.fn() }));
jest.mock('@/lib/auth', () => ({ useAuthState: () => ({ signedIn: true, email: 'me@example.com' }) }));
jest.mock('@/lib/backup', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  return {
    eraseIfPending: jest.fn(),
    isBackupConfigured: true,
    useBackupState: () => ({
      linked: useSyncExternalStore(
        (listener: () => void) => {
          mockBackup.listeners.add(listener);
          return () => mockBackup.listeners.delete(listener);
        },
        () => mockBackup.linked
      ),
    }),
  };
});
jest.mock('@/lib/theme-preference', () => ({
  applySavedThemePreference: jest.fn(),
  useColorScheme: () => 'light',
}));

describe('root layout', () => {
  beforeEach(() => {
    mockBackup.linked = true;
    clearGreeting();
  });

  it('removes the greeting when it clears, without a restart', async () => {
    setGreeting('returning');
    await render(<RootLayout />);
    expect(screen.getByText('Greeting: returning')).toBeTruthy();

    await act(async () => clearGreeting());
    expect(screen.queryByText(/Greeting/)).toBeNull();
  });

  it('opens the app when a new user finishes their profile, without a restart', async () => {
    mockBackup.linked = false;
    await render(<RootLayout />);
    expect(screen.getByText('Route: login')).toBeTruthy();

    await act(async () => {
      setGreeting('new');
      setLinked(true);
    });
    expect(screen.queryByText('Route: login')).toBeNull();
    expect(screen.getByText('Route: (tabs)')).toBeTruthy();
    expect(screen.getByText('Greeting: new')).toBeTruthy();
  });

  it('goes back to the login screen when the session ends, without a restart', async () => {
    await render(<RootLayout />);
    expect(screen.getByText('Route: (tabs)')).toBeTruthy();

    await act(async () => setLinked(false));
    expect(screen.getByText('Route: login')).toBeTruthy();
    expect(screen.queryByText('Route: (tabs)')).toBeNull();
  });
});
