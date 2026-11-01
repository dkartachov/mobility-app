import type { SQLiteDatabase } from 'expo-sqlite';

import { resetReminderPrompt } from '@/lib/reminder-prompt';

/** Wipes sessions, goals, flexibility tests, reminders and profile details, back to a fresh install. */
export async function resetAllData(db: SQLiteDatabase) {
  // WHERE clauses keep SQLite from truncating, which would skip the change hook, so `useDbQuery`
  // screens would never refresh.
  await db.execAsync(`
    DELETE FROM sessions WHERE id IS NOT NULL;
    DELETE FROM mobility_tests WHERE id IS NOT NULL;
    DELETE FROM goals WHERE id IS NOT NULL;
    DELETE FROM reminders WHERE id IS NOT NULL;
    UPDATE profile SET first_name = '', last_name = '', date_of_birth = NULL, gender = NULL, photo_file = NULL;
  `);
  resetReminderPrompt();
}
