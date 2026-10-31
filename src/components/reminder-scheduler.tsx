import { addNotificationResponseReceivedListener, setNotificationHandler } from 'expo-notifications';
import { router, usePathname } from 'expo-router';
import { addDatabaseChangeListener, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncReminderNotifications } from '@/lib/reminders';

/** Screens a reminder shouldn't interrupt, each with progress to lose. */
const SESSION_PATHS = ['/workout', '/mobility-test'];

/**
 * `dismissTo` does nothing when a tab is already showing, as there's no screen to dismiss, and
 * `navigate` from a screen above the tabs stacks a second copy of them. So each gets its own case.
 */
function goToStartTab() {
  if (router.canDismiss()) router.dismissTo('/');
  else router.navigate('/');
}

/**
 * Keeps scheduled notifications matching the `reminders` table, when it changes and whenever the
 * app opens, which also picks up permission granted in the system settings. A reminder that fires
 * while the app is open shows as usual, unless you're in a session. Tapping one goes to the Start
 * tab; a cold start lands there anyway, so only a running app needs moving. Renders nothing; it's
 * a component because it has to sit inside `SQLiteProvider`.
 */
export function ReminderScheduler() {
  const db = useSQLiteContext();
  const inSession = SESSION_PATHS.includes(usePathname());

  useEffect(() => {
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: !inSession,
        shouldShowList: !inSession,
        shouldPlaySound: !inSession,
        shouldSetBadge: false,
      }),
    });
    if (inSession) return;
    const taps = addNotificationResponseReceivedListener(goToStartTab);
    return () => taps.remove();
  }, [inSession]);

  useEffect(() => {
    syncReminderNotifications(db);
    const changes = addDatabaseChangeListener((event) => {
      if (event.tableName === 'reminders') syncReminderNotifications(db);
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') syncReminderNotifications(db);
    });

    return () => {
      changes.remove();
      appState.remove();
    };
  }, [db]);

  return null;
}
