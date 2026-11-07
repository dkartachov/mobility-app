import type { SQLiteDatabase } from 'expo-sqlite';

import {
  compareScores,
  mobilityScore,
  type Demographics,
  type MobilityScore,
  type ScoreChanges,
  type ScoredResult,
} from '@/data/mobility-score';
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
  /** Changes since the previous test, `null` before there are two. */
  changes: ScoreChanges | null;
};

/**
 * The score from the most recent test with results, `null` before there is one. Results are
 * compared with people of the profile's sex and the age the person was on the day of each test.
 */
export async function getMobilityScore(db: SQLiteDatabase): Promise<ScoreWithBaseline | null> {
  const [latest, previous] = await scoredTests(db, 2);
  if (!latest) return null;
  const current = latest.score;
  const before = previous?.score ?? null;
  return { ...current, previous: before, changes: before ? compareScores(current, before) : null };
}

const SCORE_TABLES = ['mobility_tests', 'mobility_test_results', 'profile'];

export function useMobilityScore() {
  return useDbQuery(getMobilityScore, SCORE_TABLES);
}

/** A test with results, scored, and compared with the test with results before it. */
export type PastTest = ScoreWithBaseline & {
  id: number;
  /** The day it was taken. */
  date: DateKey;
  /** Who the test was compared with: the profile's sex and the age on that day. */
  demographics: Demographics;
};

/**
 * Every test with results, newest first, scored the same way as `getMobilityScore` and each
 * compared with the one before it.
 */
export async function getTestHistory(db: SQLiteDatabase): Promise<PastTest[]> {
  const tests = await scoredTests(db);
  return tests.map(({ id, date, demographics, score }, i) => {
    const before = tests[i + 1]?.score ?? null;
    return { ...score, id, date, demographics, previous: before, changes: before ? compareScores(score, before) : null };
  });
}

export function useTestHistory() {
  return useDbQuery(getTestHistory, SCORE_TABLES);
}

/**
 * The tests with results, newest first, up to `limit`, each scored against people of the profile's
 * sex and the age the person was on the day of that test.
 */
async function scoredTests(db: SQLiteDatabase, limit = -1) {
  const { sex, dateOfBirth } = await getProfile(db);
  const tests = await db.getAllAsync<{ id: number; local_date: DateKey }>(
    `SELECT t.id, t.local_date FROM mobility_tests t
     WHERE EXISTS (SELECT 1 FROM mobility_test_results r WHERE r.mobility_test_id = t.id)
     ORDER BY t.taken_at DESC, t.id DESC LIMIT ?`,
    limit
  );
  if (!tests.length) return [];
  const results = await db.getAllAsync<ScoredResult & { testId: number }>(
    `SELECT mobility_test_id AS testId, exercise_id AS exerciseId, side, value, unit FROM mobility_test_results
     WHERE mobility_test_id IN (${tests.map(() => '?').join(', ')})`,
    ...tests.map((t) => t.id)
  );
  return tests.map((test) => {
    const demographics: Demographics = {
      sex,
      age: dateOfBirth ? ageFromDateKey(dateOfBirth, test.local_date) : null,
    };
    const score = mobilityScore(
      results.filter((r) => r.testId === test.id),
      demographics
    );
    return { id: test.id, date: test.local_date, demographics, score };
  });
}
