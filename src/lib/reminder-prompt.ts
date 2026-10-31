/**
 * When to suggest setting a reminder after a workout: while none exist, until told never to ask.
 * Answering "later" waits a few workouts. This is about this phone's install rather than your data,
 * so it lives in the key-value store and isn't part of backups.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';

import { getReminders } from '@/db/reminders';

/** Workouts to wait after answering "later". */
export const REMINDER_PROMPT_SNOOZE_WORKOUTS = 3;

const NEVER_KEY = 'reminderPrompt.never';
const WORKOUTS_LEFT_KEY = 'reminderPrompt.workoutsLeft';

function workoutsLeft() {
  return Number(Storage.getItemSync(WORKOUTS_LEFT_KEY) ?? 0);
}

/** Call once per completed workout. */
export function countWorkoutForReminderPrompt() {
  const left = workoutsLeft();
  if (left > 0) Storage.setItemSync(WORKOUTS_LEFT_KEY, String(left - 1));
}

export function snoozeReminderPrompt() {
  Storage.setItemSync(WORKOUTS_LEFT_KEY, String(REMINDER_PROMPT_SNOOZE_WORKOUTS));
}

export function neverShowReminderPrompt() {
  Storage.setItemSync(NEVER_KEY, 'true');
}

export function resetReminderPrompt() {
  Storage.removeItemSync(NEVER_KEY);
  Storage.removeItemSync(WORKOUTS_LEFT_KEY);
}

export async function shouldShowReminderPrompt(db: SQLiteDatabase) {
  if (Storage.getItemSync(NEVER_KEY) === 'true' || workoutsLeft() > 0) return false;
  return (await getReminders(db)).length === 0;
}
