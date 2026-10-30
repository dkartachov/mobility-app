import type { SQLiteDatabase } from 'expo-sqlite';

import { expectedResult } from '@/data/mobility-score';
import { FLEXIBILITY_TESTS } from '@/data/mobility-tests';
import { addDays, todayKey } from '@/lib/dates';
import { createTestDb } from '@/test-utils/sqlite';

import { addDevMobilityTestResults, DEV_RESULT_SPREAD, makeDevTestDue } from './dev';
import { getMobilityScore, getTestSchedule, RETEST_INTERVAL_DAYS } from './mobility-tests';

describe('addDevMobilityTestResults', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it('keeps earlier tests, a retest apart, ending today', async () => {
    for (let i = 0; i < 3; i++) await addDevMobilityTestResults(db);

    const dates = await db.getAllAsync<{ local_date: string }>('SELECT local_date FROM mobility_tests ORDER BY taken_at');
    expect(dates.map((d) => d.local_date)).toEqual([
      addDays(todayKey(), -2 * RETEST_INTERVAL_DAYS),
      addDays(todayKey(), -RETEST_INTERVAL_DAYS),
      todayKey(),
    ]);
  });

  it('makes today test day without losing results', async () => {
    await addDevMobilityTestResults(db);
    await makeDevTestDue(db);

    expect(await getTestSchedule(db)).toMatchObject({
      lastTestDate: addDays(todayKey(), -RETEST_INTERVAL_DAYS),
      isDue: true,
    });
    expect(await getMobilityScore(db)).not.toBeNull();
  });

  it('keeps every result near its test norm', async () => {
    for (let i = 0; i < 5; i++) await addDevMobilityTestResults(db);

    const results = await db.getAllAsync<{ exercise_id: string; value: number }>(
      'SELECT exercise_id, value FROM mobility_test_results'
    );
    for (const { exercise_id, value } of results) {
      const { norm } = FLEXIBILITY_TESTS.find((t) => t.id === exercise_id)!;
      const mean = expectedResult(norm, { sex: null, age: null });
      // Rounding can take a result half a unit past the spread.
      expect(Math.abs(value - mean)).toBeLessThanOrEqual(DEV_RESULT_SPREAD * norm.sd + 0.5);
    }
  });
});
