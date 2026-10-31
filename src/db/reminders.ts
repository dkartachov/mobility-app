import type { SQLiteDatabase } from 'expo-sqlite';

import { useDbQuery } from './use-db-query';

/** 1 is Sunday through 7 for Saturday, the numbering `expo-notifications` triggers use. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Every weekday in display order, Monday first like the rest of the app. */
export const WEEKDAYS: readonly Weekday[] = [2, 3, 4, 5, 6, 7, 1];

export type Reminder = {
  id: number;
  hour: number;
  minute: number;
  /** Never empty: a reminder that should stay quiet is turned off instead. */
  weekdays: Weekday[];
  enabled: boolean;
};

type ReminderRow = {
  id: number;
  hour: number;
  minute: number;
  weekdays: string;
  enabled: number;
};

export async function getReminders(db: SQLiteDatabase): Promise<Reminder[]> {
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT id, hour, minute, weekdays, enabled FROM reminders ORDER BY hour, minute, id'
  );
  return rows.map((row) => ({
    id: row.id,
    hour: row.hour,
    minute: row.minute,
    weekdays: row.weekdays.split(',').map((day) => Number(day) as Weekday),
    enabled: row.enabled === 1,
  }));
}

/** Adds a reminder for every day of the week, returning its ID. */
export async function createReminder(db: SQLiteDatabase, hour: number, minute: number) {
  const { lastInsertRowId } = await db.runAsync(
    'INSERT INTO reminders (hour, minute, weekdays) VALUES (?, ?, ?)',
    hour,
    minute,
    WEEKDAYS.join(',')
  );
  return lastInsertRowId;
}

export async function updateReminder(db: SQLiteDatabase, reminder: Reminder) {
  await db.runAsync(
    'UPDATE reminders SET hour = ?, minute = ?, weekdays = ?, enabled = ? WHERE id = ?',
    reminder.hour,
    reminder.minute,
    reminder.weekdays.join(','),
    reminder.enabled ? 1 : 0,
    reminder.id
  );
}

export async function deleteReminder(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM reminders WHERE id = ?', id);
}

/** Adds or removes `day`, except that the last remaining day stays selected. */
export function toggleWeekday(weekdays: Weekday[], day: Weekday): Weekday[] {
  if (!weekdays.includes(day)) return [...weekdays, day];
  return weekdays.length > 1 ? weekdays.filter((other) => other !== day) : weekdays;
}

export function useReminders() {
  return useDbQuery(getReminders, ['reminders']);
}
