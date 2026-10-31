/**
 * Exercise reminders are local notifications, one repeating weekly trigger per selected day. The
 * `reminders` table is the source of truth: scheduled notifications are matched to it, so a
 * restored backup or a reset database can't leave them out of step.
 */
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getReminders } from '@/db/reminders';

const CHANNEL_ID = 'reminders';

const CONTENT: Notifications.NotificationContentInput = {
  title: 'Time to move!',
  body: 'Your mobility session is ready when you are.',
  sound: true,
};

async function ensureChannel() {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Exercise reminders',
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

  const wanted = new Map<string, { weekday: number; hour: number; minute: number }>();
  for (const { id, hour, minute, weekdays, enabled } of await getReminders(db)) {
    if (!enabled) continue;
    for (const weekday of weekdays) {
      wanted.set(`reminder-${id}-${weekday}-${hour}-${minute}`, { weekday, hour, minute });
    }
  }

  const scheduled = new Set(
    (await Notifications.getAllScheduledNotificationsAsync()).map((request) => request.identifier)
  );
  for (const identifier of scheduled) {
    if (!wanted.has(identifier)) await Notifications.cancelScheduledNotificationAsync(identifier);
  }
  for (const [identifier, time] of wanted) {
    if (scheduled.has(identifier)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: CONTENT,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, channelId: CHANNEL_ID, ...time },
    });
  }
}

let queue: Promise<void> = Promise.resolve();

/** Makes the scheduled notifications match the table, one run at a time so runs can't interleave. */
export function syncReminderNotifications(db: SQLiteDatabase): Promise<void> {
  queue = queue.then(() => matchScheduledToReminders(db)).catch(console.warn);
  return queue;
}
