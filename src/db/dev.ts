/**
 * Development-only helpers for faking data. Only reachable from the Developer section in
 * Settings, which renders behind `__DEV__`.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { addDays, todayKey } from '@/lib/dates';
import { milestoneProgress } from '@/lib/milestones';

import { logMobilityTest, RETEST_INTERVAL_DAYS } from './mobility-tests';
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

/**
 * Walks back from today and logs a session on the first `days` days that have none, so
 * repeated presses keep extending the streak instead of re-filling the same days.
 */
export async function addDevStreak(db: SQLiteDatabase, days: number) {
  const rows = await db.getAllAsync<{ local_date: string }>('SELECT DISTINCT local_date FROM sessions');
  const trained = new Set(rows.map((r) => r.local_date));
  let added = 0;
  for (let daysAgo = 0; added < days; daysAgo++) {
    if (trained.has(addDays(todayKey(), -daysAgo))) continue;
    await addDevSession(db, 10 * 60, daysAgo);
    added++;
  }
}

/** Logs a flexibility test `daysAgo` days back. */
export async function addDevMobilityTest(db: SQLiteDatabase, daysAgo = 0) {
  const takenAt = new Date();
  takenAt.setDate(takenAt.getDate() - daysAgo);
  await logMobilityTest(db, takenAt);
}

/**
 * Makes today test day: drops tests from the last `RETEST_INTERVAL_DAYS` days (the schedule
 * follows the most recent one) and logs one exactly that many days ago.
 */
export async function makeDevTestDue(db: SQLiteDatabase) {
  await db.runAsync(
    'DELETE FROM mobility_tests WHERE local_date > ?',
    addDays(todayKey(), -RETEST_INTERVAL_DAYS)
  );
  await addDevMobilityTest(db, RETEST_INTERVAL_DAYS);
}

/** Removes every flexibility test and its results, back to "no test taken yet". */
export async function clearDevMobilityTests(db: SQLiteDatabase) {
  await db.runAsync('DELETE FROM mobility_tests WHERE id IS NOT NULL');
}

export async function clearDevSessions(db: SQLiteDatabase) {
  await db.runAsync('DELETE FROM sessions WHERE id IS NOT NULL');
}

/** Wipes sessions, goals, flexibility tests and profile details, back to a fresh install. */
export async function resetAllData(db: SQLiteDatabase) {
  // WHERE clauses keep SQLite from truncating, which would skip the change hook (see deleteAllSessions).
  await db.execAsync(`
    DELETE FROM sessions WHERE id IS NOT NULL;
    DELETE FROM mobility_tests WHERE id IS NOT NULL;
    DELETE FROM goals WHERE id IS NOT NULL;
    UPDATE profile SET first_name = '', last_name = '', date_of_birth = NULL, gender = NULL, photo_file = NULL,
      hand_length_cm = NULL, finger_length_cm = NULL, hand_span_cm = NULL, leg_length_cm = NULL;
  `);
}
