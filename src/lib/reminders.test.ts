import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';

import { createReminder, deleteReminder, updateReminder } from '@/db/reminders';
import { createTestDb } from '@/test-utils/sqlite';

import { isNotificationPermissionGranted, requestNotificationPermission, syncReminderNotifications } from './reminders';

const mockScheduled = new Set<string>();

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 5 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { WEEKLY: 'weekly' },
  cancelScheduledNotificationAsync: jest.fn(async (identifier: string) => void mockScheduled.delete(identifier)),
  getAllScheduledNotificationsAsync: jest.fn(async () => [...mockScheduled].map((identifier) => ({ identifier }))),  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async ({ identifier }: { identifier: string }) => {
    mockScheduled.add(identifier);
    return identifier;
  }),
  setNotificationChannelAsync: jest.fn(async () => null),
}));

const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const cancel = jest.mocked(Notifications.cancelScheduledNotificationAsync);
const getAll = jest.mocked(Notifications.getAllScheduledNotificationsAsync);
const setChannel = jest.mocked(Notifications.setNotificationChannelAsync);
const requestPermissions = jest.mocked(Notifications.requestPermissionsAsync);

describe('syncReminderNotifications', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockScheduled.clear();
    db = await createTestDb();
  });

  it('schedules one weekly notification per selected day', async () => {
    const id = await createReminder(db, 18, 30);
    await updateReminder(db, { id, hour: 18, minute: 30, weekdays: [2, 1], enabled: true });

    await syncReminderNotifications(db);

    expect(schedule.mock.calls.map(([request]) => request.trigger)).toEqual([
      { type: 'weekly', channelId: 'reminders', weekday: 2, hour: 18, minute: 30 },
      { type: 'weekly', channelId: 'reminders', weekday: 1, hour: 18, minute: 30 },
    ]);
  });

  it('leaves everything alone when nothing changed, so a due notification is not pushed to next week', async () => {
    await createReminder(db, 18, 30);
    await syncReminderNotifications(db);
    jest.clearAllMocks();

    await syncReminderNotifications(db);

    expect(schedule).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('changing one reminder leaves the others alone', async () => {
    const id = await createReminder(db, 18, 30);
    await updateReminder(db, { id, hour: 18, minute: 30, weekdays: [2], enabled: true });
    const other = await createReminder(db, 18, 35);
    await updateReminder(db, { id: other, hour: 18, minute: 35, weekdays: [2], enabled: true });
    await syncReminderNotifications(db);
    jest.clearAllMocks();

    await updateReminder(db, { id, hour: 7, minute: 0, weekdays: [2], enabled: true });
    await syncReminderNotifications(db);

    expect(cancel.mock.calls).toEqual([[`reminder-${id}-2-18-30`]]);
    expect(schedule.mock.calls.map(([request]) => request.identifier)).toEqual([`reminder-${id}-2-7-0`]);
  });

  it('cancels reminders that are turned off or deleted', async () => {
    const off = await createReminder(db, 8, 0);
    await updateReminder(db, { id: off, hour: 8, minute: 0, weekdays: [2], enabled: true });
    const deleted = await createReminder(db, 9, 0);
    await updateReminder(db, { id: deleted, hour: 9, minute: 0, weekdays: [2], enabled: true });
    await syncReminderNotifications(db);

    await updateReminder(db, { id: off, hour: 8, minute: 0, weekdays: [2], enabled: false });
    await deleteReminder(db, deleted);
    await syncReminderNotifications(db);

    expect(mockScheduled.size).toBe(0);
  });

  it('keeps working after a failed run', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    getAll.mockRejectedValueOnce(new Error('nope'));
    await createReminder(db, 18, 30);

    await syncReminderNotifications(db);
    expect(schedule).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();

    await syncReminderNotifications(db);
    expect(schedule).toHaveBeenCalledTimes(7);
  });
});

describe('requestNotificationPermission', () => {
  it('creates the channel before asking', async () => {
    jest.clearAllMocks();

    await requestNotificationPermission();

    expect(setChannel.mock.invocationCallOrder[0]).toBeLessThan(requestPermissions.mock.invocationCallOrder[0]);
  });
});

describe('isNotificationPermissionGranted', () => {
  const status = (fields: object) => fields as Notifications.NotificationPermissionsStatus;

  it('accepts granted and provisional, and nothing else', () => {
    expect(isNotificationPermissionGranted(status({ granted: true }))).toBe(true);
    expect(isNotificationPermissionGranted(status({ granted: false, ios: { status: 3 } }))).toBe(true);
    expect(isNotificationPermissionGranted(status({ granted: false, ios: { status: 1 } }))).toBe(false);
    expect(isNotificationPermissionGranted(status({ granted: false }))).toBe(false);
  });
});
