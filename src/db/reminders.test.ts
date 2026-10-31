import type { SQLiteDatabase } from 'expo-sqlite';

import { createTestDb } from '@/test-utils/sqlite';

import { createReminder, deleteReminder, getReminders, toggleWeekday, updateReminder, WEEKDAYS } from './reminders';

describe('reminders', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it('creates an enabled reminder for every day of the week', async () => {
    const id = await createReminder(db, 18, 30);

    expect(await getReminders(db)).toEqual([{ id, hour: 18, minute: 30, weekdays: [...WEEKDAYS], enabled: true }]);
  });

  it('lists reminders by time of day', async () => {
    await createReminder(db, 18, 30);
    await createReminder(db, 7, 45);
    await createReminder(db, 18, 0);

    const reminders = await getReminders(db);
    expect(reminders.map((r) => [r.hour, r.minute])).toEqual([
      [7, 45],
      [18, 0],
      [18, 30],
    ]);
  });

  it('updates a reminder', async () => {
    const id = await createReminder(db, 18, 30);

    await updateReminder(db, { id, hour: 8, minute: 5, weekdays: [2, 4], enabled: false });

    expect(await getReminders(db)).toEqual([{ id, hour: 8, minute: 5, weekdays: [2, 4], enabled: false }]);
  });

  it('deletes a reminder', async () => {
    const first = await createReminder(db, 8, 0);
    const second = await createReminder(db, 9, 0);

    await deleteReminder(db, first);

    expect((await getReminders(db)).map((r) => r.id)).toEqual([second]);
  });
});

describe('toggleWeekday', () => {
  it('adds a day that is not selected', () => {
    expect(toggleWeekday([2], 3)).toEqual([2, 3]);
  });

  it('removes a selected day', () => {
    expect(toggleWeekday([2, 3], 2)).toEqual([3]);
  });

  it('keeps the last remaining day', () => {
    expect(toggleWeekday([2], 2)).toEqual([2]);
  });
});
