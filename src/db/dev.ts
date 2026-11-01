/**
 * Development-only helpers for faking data. Only reachable from the Developer section in
 * Settings, which renders behind `__DEV__`.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { expectedResult } from '@/data/mobility-score';
import { METHOD_UNITS, TEST_STEPS } from '@/data/mobility-tests';
import { addDays, daysBetween, todayKey } from '@/lib/dates';
import { milestoneProgress } from '@/lib/milestones';

import { getTestSchedule, logMobilityTest, RETEST_INTERVAL_DAYS } from './mobility-tests';
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
 * repeated presses keep going further back instead of re-filling the same days.
 */
export async function addDevTrainingDays(db: SQLiteDatabase, days: number) {
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

/** How far a made-up result can move from the previous one, in standard deviations of its test's norm. */
const DEV_RESULT_DRIFT = 0.3;
/** Where first made-up results fall, in standard deviations better than average (scores of 50–90). */
const DEV_FIRST_RESULT_RANGE = [0, 1.28] as const;
/** Made-up results stay within this many standard deviations of average. */
export const DEV_RESULT_SPREAD = 2.5;

/**
 * Made-up results for every test step. Without earlier results they land between average and the
 * top tenth of each test's norm; otherwise each one drifts a little from its previous value, so a
 * run of them looks like a real history with ups and downs.
 */
function randomResults(previous: Map<string, number>) {
  return TEST_STEPS.map(({ test, side }) => {
    const { sd } = test.norm;
    const mean = expectedResult(test.norm, { sex: null, age: null });
    const last = previous.get(`${test.id}:${side}`);
    const [firstLow, firstHigh] = DEV_FIRST_RESULT_RANGE;
    const value =
      last === undefined
        ? mean + (firstLow + Math.random() * (firstHigh - firstLow)) * sd
        : last + (Math.random() * 2 - 1) * DEV_RESULT_DRIFT * sd;
    // Distances also stay on their slider.
    const { method } = test;
    const low = Math.max(mean - DEV_RESULT_SPREAD * sd, method.kind === 'distance' ? method.min : -Infinity);
    const high = Math.min(mean + DEV_RESULT_SPREAD * sd, method.kind === 'distance' ? method.max : Infinity);
    return {
      exerciseId: test.id,
      side,
      value: Math.round(Math.min(high, Math.max(low, value))),
      unit: METHOD_UNITS[test.method.kind],
    };
  });
}

/**
 * Logs a flexibility test today with made-up results, keeping every earlier test. Earlier tests
 * move back `RETEST_INTERVAL_DAYS` first, so repeated presses build a history of tests a retest
 * apart that ends today.
 */
export async function addDevMobilityTestResults(db: SQLiteDatabase) {
  const latest = await db.getAllAsync<{ exercise_id: string; side: string | null; value: number }>(
    `SELECT exercise_id, side, value FROM mobility_test_results
     WHERE mobility_test_id = (
       SELECT t.id FROM mobility_tests t
       WHERE EXISTS (SELECT 1 FROM mobility_test_results r WHERE r.mobility_test_id = t.id)
       ORDER BY t.taken_at DESC, t.id DESC LIMIT 1
     )`
  );
  const previous = new Map(latest.map((r) => [`${r.exercise_id}:${r.side}`, r.value]));
  await moveDevMobilityTestsBack(db, RETEST_INTERVAL_DAYS);
  await logMobilityTest(db, new Date(), randomResults(previous));
}

/** Moves every flexibility test `days` earlier, keeping their results. */
async function moveDevMobilityTestsBack(db: SQLiteDatabase, days: number) {
  const shift = `-${days} days`;
  await db.runAsync(
    `UPDATE mobility_tests
     SET taken_at = strftime('%Y-%m-%dT%H:%M:%fZ', taken_at, ?), local_date = date(local_date, ?)
     WHERE id IS NOT NULL`,
    shift,
    shift
  );
}

/**
 * Makes today test day by moving every test back until the latest is exactly
 * `RETEST_INTERVAL_DAYS` ago, so their results and score stay. Without any tests, logs an empty
 * one that long ago.
 */
export async function makeDevTestDue(db: SQLiteDatabase) {
  const { lastTestDate } = await getTestSchedule(db);
  if (!lastTestDate) {
    await addDevMobilityTest(db, RETEST_INTERVAL_DAYS);
    return;
  }
  const daysAgo = daysBetween(lastTestDate, todayKey());
  if (daysAgo < RETEST_INTERVAL_DAYS) await moveDevMobilityTestsBack(db, RETEST_INTERVAL_DAYS - daysAgo);
}

/** Removes every flexibility test and its results, back to "no test taken yet". */
export async function clearDevMobilityTests(db: SQLiteDatabase) {
  await db.runAsync('DELETE FROM mobility_tests WHERE id IS NOT NULL');
}

export async function clearDevSessions(db: SQLiteDatabase) {
  await db.runAsync('DELETE FROM sessions WHERE id IS NOT NULL');
}
