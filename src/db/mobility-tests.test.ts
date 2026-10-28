import type { SQLiteDatabase } from 'expo-sqlite';

import { createTestDb } from '@/test-utils/sqlite';

import { getTestSchedule, logMobilityTest, RETEST_INTERVAL_DAYS } from './mobility-tests';

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
      { exerciseId: 'butterfly', side: 'left', value: 8.5, unit: 'cm' },
    ]);

    expect(
      await db.getAllAsync('SELECT mobility_test_id, exercise_id, side, value, unit FROM mobility_test_results ORDER BY id')
    ).toEqual([
      { mobility_test_id: 1, exercise_id: 'straddle', side: null, value: 110, unit: 'deg' },
      { mobility_test_id: 1, exercise_id: 'butterfly', side: 'left', value: 8.5, unit: 'cm' },
    ]);
  });

  it('saves nothing if a measurement fails to save', async () => {
    const bad = { exerciseId: null as unknown as string, side: null, value: 1, unit: 'cm' as const };

    await expect(logMobilityTest(db, new Date(2026, 9, 1, 9), [bad])).rejects.toThrow();

    expect(await db.getAllAsync('SELECT * FROM mobility_tests')).toEqual([]);
  });
});
