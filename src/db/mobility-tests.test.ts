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
      { exerciseId: 'sit-and-reach', side: null, value: 5, unit: 'cm' },
      { exerciseId: 'knee-to-wall', side: 'left', value: 9.5, unit: 'cm' },
    ]);

    expect(
      await db.getAllAsync('SELECT mobility_test_id, exercise_id, side, value, unit FROM mobility_test_results ORDER BY id')
    ).toEqual([
      { mobility_test_id: 1, exercise_id: 'sit-and-reach', side: null, value: 5, unit: 'cm' },
      { mobility_test_id: 1, exercise_id: 'knee-to-wall', side: 'left', value: 9.5, unit: 'cm' },
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

  // Without a profile, sit and reach is compared with both sexes up to the peak age: 1.75 cm ± 10 cm.
  it('scores the latest test with results', async () => {
    await logMobilityTest(db, new Date(2026, 8, 1, 9), [{ exerciseId: 'sit-and-reach', side: null, value: 1.75, unit: 'cm' }]);
    await logMobilityTest(db, new Date(2026, 9, 1, 9), [{ exerciseId: 'sit-and-reach', side: null, value: 11.75, unit: 'cm' }]);
    // A later test without results, like the dev tools' "Log flexibility test today", doesn't count.
    await logMobilityTest(db, new Date(2026, 9, 2, 9));

    expect(await getMobilityScore(db)).toMatchObject({
      areas: { postChain: expect.closeTo(84.13, 2), ankles: null },
      overall: expect.closeTo(84.13, 2),
      previous: { areas: { postChain: expect.closeTo(50, 5), ankles: null }, overall: expect.closeTo(50, 5) },
    });
  });

  it('has no previous score after only one test with results', async () => {
    await logMobilityTest(db, new Date(2026, 9, 1, 9), [{ exerciseId: 'sit-and-reach', side: null, value: 11.75, unit: 'cm' }]);
    expect(await getMobilityScore(db)).toMatchObject({ overall: expect.closeTo(84.13, 2), previous: null });
  });

  it("compares with the profile's sex and the age on the day of each test", async () => {
    await db.runAsync("UPDATE profile SET gender = 'female', date_of_birth = '1976-06-01' WHERE id = 1");
    // 5 cm for women, less 0.6 cm a decade past 30: 3.8 cm at 50 and 3.2 cm at 60.
    await logMobilityTest(db, new Date(2026, 8, 1, 9), [{ exerciseId: 'sit-and-reach', side: null, value: 3.8, unit: 'cm' }]);
    await logMobilityTest(db, new Date(2036, 8, 1, 9), [{ exerciseId: 'sit-and-reach', side: null, value: 3.2, unit: 'cm' }]);

    expect(await getMobilityScore(db)).toMatchObject({
      overall: expect.closeTo(50, 5),
      previous: { overall: expect.closeTo(50, 5) },
    });
  });
});
