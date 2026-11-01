import type { SQLiteDatabase } from 'expo-sqlite';

import { createTestDb } from '@/test-utils/sqlite';

import { getMonthTrainingDays, getStats, getTotalSeconds, getWeekDays, logSession } from './sessions';

describe('session queries', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 28, 12) });
    db = await createTestDb();
  });

  afterEach(() => jest.useRealTimers());

  it('reports empty stats before any sessions', async () => {
    expect(await getStats(db)).toEqual({
      totalSeconds: 0,
      sessionCount: 0,
      trainedToday: false,
      firstSessionDate: null,
    });
    expect(await getTotalSeconds(db)).toBe(0);
  });

  it('only counts a session from today as training today', async () => {
    await logSession(db, { startedAt: new Date(2026, 9, 27, 23, 50), durationSeconds: 900 });
    expect((await getStats(db)).trainedToday).toBe(false);

    await logSession(db, { startedAt: new Date(2026, 9, 28, 0, 10), durationSeconds: 900 });
    expect((await getStats(db)).trainedToday).toBe(true);
  });

  it('groups a month by day, leaving out the months around it', async () => {
    await logSession(db, { startedAt: new Date(2026, 7, 31, 23, 50), durationSeconds: 100 });
    await logSession(db, { startedAt: new Date(2026, 8, 1, 7), durationSeconds: 600 });
    await logSession(db, { startedAt: new Date(2026, 8, 15, 8), durationSeconds: 600 });
    await logSession(db, { startedAt: new Date(2026, 8, 15, 18), durationSeconds: 300 });
    await logSession(db, { startedAt: new Date(2026, 8, 30, 23, 50), durationSeconds: 480 });
    await logSession(db, { startedAt: new Date(2026, 9, 1, 0, 10), durationSeconds: 100 });

    expect(await getMonthTrainingDays(db, '2026-09-01')).toEqual([
      { date: '2026-09-01', sessions: 1, seconds: 600 },
      { date: '2026-09-15', sessions: 2, seconds: 900 },
      { date: '2026-09-30', sessions: 1, seconds: 480 },
    ]);
  });

  it('totals sessions by local day', async () => {
    await logSession(db, { startedAt: new Date(2026, 9, 26, 7), durationSeconds: 480 });
    await logSession(db, { startedAt: new Date(2026, 9, 27, 23, 50), durationSeconds: 900 });
    await logSession(db, { startedAt: new Date(2026, 9, 28, 8), durationSeconds: 600, routineId: 'daily' });
    await logSession(db, { startedAt: new Date(2026, 9, 28, 18), durationSeconds: 300 });

    expect(await getStats(db)).toEqual({
      totalSeconds: 2280,
      sessionCount: 4,
      trainedToday: true,
      firstSessionDate: '2026-10-26',
    });
    expect(await getTotalSeconds(db)).toBe(2280);
  });

  it('lists this week from Monday to Sunday with whether each day was trained', async () => {
    await logSession(db, { startedAt: new Date(2026, 9, 25, 9), durationSeconds: 600 });
    await logSession(db, { startedAt: new Date(2026, 9, 26, 9), durationSeconds: 600 });
    await logSession(db, { startedAt: new Date(2026, 9, 28, 8), durationSeconds: 600 });
    await logSession(db, { startedAt: new Date(2026, 9, 28, 18), durationSeconds: 300 });

    expect(await getWeekDays(db)).toEqual([
      { date: '2026-10-26', trained: true },
      { date: '2026-10-27', trained: false },
      { date: '2026-10-28', trained: true },
      { date: '2026-10-29', trained: false },
      { date: '2026-10-30', trained: false },
      { date: '2026-10-31', trained: false },
      { date: '2026-11-01', trained: false },
    ]);
  });

  it('starts empty again on the Monday after a full week', async () => {
    for (let day = 26; day <= 32; day++) {
      await logSession(db, { startedAt: new Date(2026, 9, day, 9), durationSeconds: 600 });
    }

    jest.setSystemTime(new Date(2026, 10, 1, 12));
    expect((await getWeekDays(db)).every((day) => day.trained)).toBe(true);

    jest.setSystemTime(new Date(2026, 10, 2, 0, 1));
    expect((await getWeekDays(db)).some((day) => day.trained)).toBe(false);
  });
});
