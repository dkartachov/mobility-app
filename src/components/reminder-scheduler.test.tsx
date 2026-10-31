import { act } from '@testing-library/react-native';
import { router, Stack } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { renderRouter } from 'expo-router/testing-library';
import type { NotificationBehavior, NotificationHandler } from 'expo-notifications';
import { Text } from 'react-native';

import { ReminderScheduler } from './reminder-scheduler';

const mockTapListeners = new Set<() => void>();
const mockHandler: { current?: NotificationHandler | null } = {};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({}),
  addDatabaseChangeListener: () => ({ remove: () => {} }),
}));

jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: (listener: () => void) => {
    mockTapListeners.add(listener);
    return { remove: () => mockTapListeners.delete(listener) };
  },
  setNotificationHandler: (handler: NotificationHandler | null) => {
    mockHandler.current = handler;
  },
}));

jest.mock('@/lib/reminders', () => ({ syncReminderNotifications: jest.fn() }));

const Screen = () => <Text>screen</Text>;

/** The app's real navigator shape, so these run against expo-router's actual behaviour. */
const routes = {
  _layout: () => (
    <>
      <ReminderScheduler />
      <Stack />
    </>
  ),
  '(tabs)/_layout': () => (
    <NativeTabs>
      <NativeTabs.Trigger name="dashboard" />
      <NativeTabs.Trigger name="index" />
      <NativeTabs.Trigger name="profile" />
    </NativeTabs>
  ),
  '(tabs)/index': Screen,
  '(tabs)/dashboard': Screen,
  '(tabs)/profile': Screen,
  settings: Screen,
  workout: Screen,
  'mobility-test': Screen,
};

async function tapReminder() {
  await act(async () => mockTapListeners.forEach((listener) => listener()));
}

async function behavior() {
  const handle = mockHandler.current!.handleNotification as () => Promise<NotificationBehavior>;
  return handle();
}

describe('ReminderScheduler', () => {
  beforeEach(() => {
    mockTapListeners.clear();
  });

  it('switches to the Start tab from another tab', async () => {
    const screen = await renderRouter(routes, { initialUrl: '/dashboard' });

    await tapReminder();

    expect(screen.getPathname()).toBe('/');
  });

  it('goes to the Start tab from a screen above the tabs, without stacking another copy', async () => {
    const screen = await renderRouter(routes, { initialUrl: '/profile' });
    await act(async () => router.push('/settings'));

    await tapReminder();

    expect(screen.getPathname()).toBe('/');
    expect(router.canDismiss()).toBe(false);
  });

  it.each(['/workout', '/mobility-test'] as const)('stays on %s and keeps quiet there', async (pathname) => {
    const screen = await renderRouter(routes, { initialUrl: '/' });
    await act(async () => router.push(pathname));

    await tapReminder();

    expect(screen.getPathname()).toBe(pathname);
    expect(await behavior()).toMatchObject({ shouldShowBanner: false, shouldPlaySound: false });
  });

  it('shows a reminder that fires while the app is open', async () => {
    await renderRouter(routes, { initialUrl: '/dashboard' });

    expect(await behavior()).toMatchObject({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true });
  });
});
