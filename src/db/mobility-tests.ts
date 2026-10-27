import type { SQLiteDatabase } from 'expo-sqlite';

import type { Side } from '@/data/mobility-tests';
import { addDays, daysBetween, toDateKey, todayKey, type DateKey } from '@/lib/dates';

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
  /** Raw slider position for now (0–1); real units come later. */
  value: number;
};

export async function logMobilityTest(db: SQLiteDatabase, takenAt: Date, measurements: Measurement[] = []) {
  await db.withTransactionAsync(async () => {
    const { lastInsertRowId } = await db.runAsync(
      'INSERT INTO mobility_tests (taken_at, local_date) VALUES (?, ?)',
      takenAt.toISOString(),
      toDateKey(takenAt)
    );
    for (const { exerciseId, side, value } of measurements) {
      await db.runAsync(
        'INSERT INTO mobility_test_results (mobility_test_id, exercise_id, side, value) VALUES (?, ?, ?, ?)',
        lastInsertRowId,
        exerciseId,
        side,
        value
      );
    }
  });
}

async function getTestSchedule(db: SQLiteDatabase): Promise<TestSchedule> {
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
