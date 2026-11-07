/**
 * Exercise reminders are local notifications, one repeating weekly trigger per selected day. The
 * `reminders` table is the source of truth: scheduled notifications are matched to it, so a
 * restored backup or a reset database can't leave them out of step. Test reminders work the same
 * way from the latest test: one notification on the day the next one is due, unless turned off.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getTestSchedule, RETEST_INTERVAL_DAYS } from '@/db/mobility-tests';
import { getReminders } from '@/db/reminders';
import { fromDateKey } from '@/lib/dates';
import { getTestRemindersEnabled } from '@/lib/test-reminder-preference';

const CHANNEL_ID = 'reminders';

const CONTENT: Notifications.NotificationContentInput = {
  title: 'Time to move!',
  body: 'Your mobility session is ready when you are.',
  sound: true,
};

/** Test reminders have their own channel, so Android's settings can turn them off separately. */
const TEST_CHANNEL_ID = 'test-reminders';

/** Test reminders come in the morning of the day the test is due. */
const TEST_REMINDER_HOUR = 10;

/** Marks a test reminder, so tapping it can open the mobility score rather than the Start tab. */
export const TEST_REMINDER_KIND = 'test';

const TEST_CONTENT: Notifications.NotificationContentInput = {
  title: 'Time for a flexibility test',
  body: `It's been ${RETEST_INTERVAL_DAYS} days. See how your mobility has changed.`,
  sound: true,
  data: { kind: TEST_REMINDER_KIND },
};

async function ensureChannel() {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Exercise reminders',
    importance: AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync(TEST_CHANNEL_ID, {
    name: 'Test reminders',
    importance: AndroidImportance.HIGH,
  });
}

export function isNotificationPermissionGranted(status: Notifications.NotificationPermissionsStatus) {
  return status.granted || status.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}

/** Shows the system prompt if it still can. */
export async function requestNotificationPermission() {
  // Android 13 and later don't show the prompt until a channel exists.
  await ensureChannel();
  return Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } });
}

/**
 * Only touches what differs, never a notification that's still right. Scheduling computes the next
 * time from now, so redoing one that's due but not yet delivered would skip it until next week.
 * The identifier holds the whole schedule, so changing a time gives it a new one. It doesn't hold
 * `CONTENT`, so new wording only reaches notifications scheduled after the change.
 */
async function matchScheduledToReminders(db: SQLiteDatabase) {
  await ensureChannel();

  const wanted = new Map<string, Omit<Notifications.NotificationRequestInput, 'identifier'>>();
  for (const { id, hour, minute, weekdays, enabled } of await getReminders(db)) {
    if (!enabled) continue;
    for (const weekday of weekdays) {
      wanted.set(`reminder-${id}-${weekday}-${hour}-${minute}`, {
        content: CONTENT,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          channelId: CHANNEL_ID,
          weekday,
          hour,
          minute,
        },
      });
    }
  }

  // One for the next test, once there's been one. A test that's already due has nothing to schedule.
  const { nextTestDate } = await getTestSchedule(db);
  if (getTestRemindersEnabled() && nextTestDate) {
    const date = fromDateKey(nextTestDate);
    date.setHours(TEST_REMINDER_HOUR);
    if (date.getTime() > Date.now()) {
      wanted.set(`test-reminder-${nextTestDate}-${TEST_REMINDER_HOUR}`, {
        content: TEST_CONTENT,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, channelId: TEST_CHANNEL_ID, date },
      });
    }
  }

  const scheduled = new Set(
    (await Notifications.getAllScheduledNotificationsAsync()).map((request) => request.identifier)
  );
  for (const identifier of scheduled) {
    if (!wanted.has(identifier)) await Notifications.cancelScheduledNotificationAsync(identifier);
  }
  for (const [identifier, request] of wanted) {
    if (scheduled.has(identifier)) continue;
    await Notifications.scheduleNotificationAsync({ identifier, ...request });
  }
}

let queue: Promise<void> = Promise.resolve();

/** Makes the scheduled notifications match the table, one run at a time so runs can't interleave. */
export function syncReminderNotifications(db: SQLiteDatabase): Promise<void> {
  queue = queue.then(() => matchScheduledToReminders(db)).catch(console.warn);
  return queue;
}
