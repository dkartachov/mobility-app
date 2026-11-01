import type { SQLiteDatabase } from 'expo-sqlite';

import { mobilityScore, type Demographics, type MobilityScore, type ScoredResult } from '@/data/mobility-score';
import type { Side, Unit } from '@/data/mobility-tests';
import { addDays, ageFromDateKey, daysBetween, toDateKey, todayKey, type DateKey } from '@/lib/dates';

import { getProfile } from './profile';
import { useDbQuery } from './use-db-query';

/** A flexibility test is due this many days after the previous one. */
export const RETEST_INTERVAL_DAYS = 30;

export type TestSchedule = {
  /** Day of the most recent test, `null` before the first one. */
  lastTestDate: DateKey | null;
  /** First day the next test is due, `null` before the first test (it's due right away). */
  nextTestDate: DateKey | null;
  /** 0 when a test is due. */
  daysUntilNext: number;
  isDue: boolean;
};

export type Measurement = {
  exerciseId: string;
  side: Side | null;
  value: number;
  unit: Unit;
};

export async function logMobilityTest(db: SQLiteDatabase, takenAt: Date, measurements: Measurement[] = []) {
  await db.withTransactionAsync(async () => {
    const { lastInsertRowId } = await db.runAsync(
      'INSERT INTO mobility_tests (taken_at, local_date) VALUES (?, ?)',
      takenAt.toISOString(),
      toDateKey(takenAt)
    );
    for (const { exerciseId, side, value, unit } of measurements) {
      await db.runAsync(
        'INSERT INTO mobility_test_results (mobility_test_id, exercise_id, side, value, unit) VALUES (?, ?, ?, ?, ?)',
        lastInsertRowId,
        exerciseId,
        side,
        value,
        unit
      );
    }
  });
}

export async function getTestSchedule(db: SQLiteDatabase): Promise<TestSchedule> {
  const row = await db.getFirstAsync<{ last: string | null }>('SELECT MAX(local_date) AS last FROM mobility_tests');
  const lastTestDate = row?.last ?? null;
  if (!lastTestDate) return { lastTestDate: null, nextTestDate: null, daysUntilNext: 0, isDue: true };

  const nextTestDate = addDays(lastTestDate, RETEST_INTERVAL_DAYS);
  const daysUntilNext = Math.max(0, daysBetween(todayKey(), nextTestDate));
  return { lastTestDate, nextTestDate, daysUntilNext, isDue: daysUntilNext === 0 };
}

export function useTestSchedule() {
  return useDbQuery(getTestSchedule, ['mobility_tests']);
}

/** The latest score, with the one from the test before it to compare against. */
export type ScoreWithBaseline = MobilityScore & {
  /** The score from the previous test with results, `null` before there are two. */
  previous: MobilityScore | null;
};

/**
 * The score from the most recent test with results, `null` before there is one. Results are
 * compared with people of the profile's sex and the age the person was on the day of each test.
 */
export async function getMobilityScore(db: SQLiteDatabase): Promise<ScoreWithBaseline | null> {
  const { sex, dateOfBirth } = await getProfile(db);
  const tests = await db.getAllAsync<{ id: number; local_date: DateKey }>(
    `SELECT t.id, t.local_date FROM mobility_tests t
     WHERE EXISTS (SELECT 1 FROM mobility_test_results r WHERE r.mobility_test_id = t.id)
     ORDER BY t.taken_at DESC, t.id DESC LIMIT 2`
  );
  const scoreOf = async (test: (typeof tests)[number]) => {
    const demographics: Demographics = {
      sex,
      age: dateOfBirth ? ageFromDateKey(dateOfBirth, test.local_date) : null,
    };
    return mobilityScore(
      await db.getAllAsync<ScoredResult>(
        'SELECT exercise_id AS exerciseId, side, value, unit FROM mobility_test_results WHERE mobility_test_id = ?',
        test.id
      ),
      demographics
    );
  };
  const [latest, previous] = tests;
  if (!latest) return null;
  return { ...(await scoreOf(latest)), previous: previous ? await scoreOf(previous) : null };
}

export function useMobilityScore() {
  return useDbQuery(getMobilityScore, ['mobility_tests', 'mobility_test_results', 'profile']);
}
