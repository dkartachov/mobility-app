import type { SQLiteDatabase } from 'expo-sqlite';

import { createTestDb } from '@/test-utils/sqlite';

import { getMobilityScore, getTestSchedule, logMobilityTest, RETEST_INTERVAL_DAYS } from './mobility-tests';

describe('mobility tests', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(() => jest.useRealTimers());

  it('is due right away before the first test', async () => {
    expect(await getTestSchedule(db)).toEqual({ lastTestDate: null, nextTestDate: null, daysUntilNext: 0, isDue: true });
  });

  it(`is due again ${RETEST_INTERVAL_DAYS} days after the latest test`, async () => {
    await logMobilityTest(db, new Date(2026, 8, 1, 9));
    await logMobilityTest(db, new Date(2026, 9, 1, 9));

    jest.useFakeTimers({ now: new Date(2026, 9, 21, 12) });
    expect(await getTestSchedule(db)).toEqual({
      lastTestDate: '2026-10-01',
      nextTestDate: '2026-10-31',
      daysUntilNext: 10,
      isDue: false,
    });

    jest.useFakeTimers({ now: new Date(2026, 9, 31, 12) });
    expect(await getTestSchedule(db)).toMatchObject({ daysUntilNext: 0, isDue: true });

    jest.useFakeTimers({ now: new Date(2026, 10, 15, 12) });
    expect(await getTestSchedule(db)).toMatchObject({ daysUntilNext: 0, isDue: true });
  });

  it('saves every measurement with the test', async () => {
    await logMobilityTest(db, new Date(2026, 9, 1, 9), [
      { exerciseId: 'straddle', side: null, value: 110, unit: 'deg' },
      { exerciseId: 'ankle-lunge', side: 'left', value: 38.5, unit: 'deg' },
    ]);

    expect(
      await db.getAllAsync('SELECT mobility_test_id, exercise_id, side, value, unit FROM mobility_test_results ORDER BY id')
    ).toEqual([
      { mobility_test_id: 1, exercise_id: 'straddle', side: null, value: 110, unit: 'deg' },
      { mobility_test_id: 1, exercise_id: 'ankle-lunge', side: 'left', value: 38.5, unit: 'deg' },
    ]);
  });

  it('saves nothing if a measurement fails to save', async () => {
    const bad = { exerciseId: null as unknown as string, side: null, value: 1, unit: 'cm' as const };

    await expect(logMobilityTest(db, new Date(2026, 9, 1, 9), [bad])).rejects.toThrow();

    expect(await db.getAllAsync('SELECT * FROM mobility_tests')).toEqual([]);
  });

  it('has no score before a test with results', async () => {
    expect(await getMobilityScore(db)).toBeNull();
    await logMobilityTest(db, new Date(2026, 9, 1, 9));
    expect(await getMobilityScore(db)).toBeNull();
  });

  it('scores the latest test with results', async () => {
    await logMobilityTest(db, new Date(2026, 8, 1, 9), [{ exerciseId: 'straddle', side: null, value: 60, unit: 'deg' }]);
    await logMobilityTest(db, new Date(2026, 9, 1, 9), [{ exerciseId: 'straddle', side: null, value: 150, unit: 'deg' }]);
    // A later test without results, like the dev tools' "Log flexibility test today", doesn't count.
    await logMobilityTest(db, new Date(2026, 9, 2, 9));

    expect(await getMobilityScore(db)).toMatchObject({
      areas: { hips: 100, ankles: null },
      overall: 100,
      previous: { areas: { hips: 0, ankles: null }, overall: 0 },
    });
  });

  it('has no previous score after only one test with results', async () => {
    await logMobilityTest(db, new Date(2026, 9, 1, 9), [{ exerciseId: 'straddle', side: null, value: 150, unit: 'deg' }]);
    expect(await getMobilityScore(db)).toMatchObject({ overall: 100, previous: null });
  });
});
