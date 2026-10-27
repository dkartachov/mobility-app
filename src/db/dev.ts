/**
 * Development-only helpers for faking data. Only reachable from the Developer section in
 * Settings, which renders behind `__DEV__`.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { milestoneProgress } from '@/lib/milestones';

import { getTotalSeconds, logSession } from './sessions';

export async function addDevSession(db: SQLiteDatabase, durationSeconds: number, daysAgo = 0) {
  const startedAt = new Date();
  startedAt.setDate(startedAt.getDate() - daysAgo);
  await logSession(db, { startedAt, durationSeconds, routineId: 'dev' });
}

/** Logs whatever is missing to land `secondsShort` below the next milestone. */
export async function jumpToNextMilestone(db: SQLiteDatabase, secondsShort: number) {
  const total = await getTotalSeconds(db);
  const { nextHours } = milestoneProgress(total);
  if (nextHours === null) return;
  const gap = nextHours * 3600 - secondsShort - total;
  if (gap > 0) await addDevSession(db, gap);
}

/** One session per day for the past `days` days, ending today. */
export async function addDevStreak(db: SQLiteDatabase, days: number) {
  for (let i = 0; i < days; i++) await addDevSession(db, 10 * 60, i);
}

/** Wipes sessions, goals and profile details, back to a fresh install. */
export async function resetAllData(db: SQLiteDatabase) {
  // WHERE clauses keep SQLite from truncating, which would skip the change hook (see deleteAllSessions).
  await db.execAsync(`
    DELETE FROM sessions WHERE id IS NOT NULL;
    DELETE FROM goals WHERE id IS NOT NULL;
    UPDATE profile SET first_name = '', last_name = '', date_of_birth = NULL, gender = NULL, photo_file = NULL;
  `);
}
