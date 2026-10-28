import type { SQLiteDatabase } from 'expo-sqlite';

import { createTestDb } from '@/test-utils/sqlite';

import { computeStreaks, deleteAllSessions, getStats, getTotalSeconds, logSession } from './sessions';

describe('computeStreaks', () => {
  const today = '2026-10-28';

  it('is empty before any sessions', () => {
    expect(computeStreaks([], today)).toEqual({ current: 0, longest: 0, trainedToday: false });
  });

  it('counts a streak that includes today', () => {
    expect(computeStreaks(['2026-10-26', '2026-10-27', '2026-10-28'], today)).toEqual({
      current: 3,
      longest: 3,
      trainedToday: true,
    });
  });

  it('keeps the current streak alive through today if yesterday was trained', () => {
    expect(computeStreaks(['2026-10-26', '2026-10-27'], today)).toEqual({
      current: 2,
      longest: 2,
      trainedToday: false,
    });
  });

  it('resets the current streak after a full missed day', () => {
    expect(computeStreaks(['2026-10-25', '2026-10-26'], today).current).toBe(0);
  });

  it('remembers the longest streak separately from the current one', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-10-27', '2026-10-28'];
    expect(computeStreaks(days, today)).toEqual({ current: 2, longest: 4, trainedToday: true });
  });

  it('counts streaks across month boundaries', () => {
    expect(computeStreaks(['2026-09-30', '2026-10-01'], '2026-10-01').current).toBe(2);
  });
});

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
      currentStreak: 0,
      longestStreak: 0,
      trainedToday: false,
      firstSessionDate: null,
    });
    expect(await getTotalSeconds(db)).toBe(0);
  });

  it('totals sessions and counts streaks by local day', async () => {
    await logSession(db, { startedAt: new Date(2026, 9, 26, 7), durationSeconds: 480 });
    await logSession(db, { startedAt: new Date(2026, 9, 27, 23, 50), durationSeconds: 900 });
    await logSession(db, { startedAt: new Date(2026, 9, 28, 8), durationSeconds: 600, routineId: 'daily' });
    await logSession(db, { startedAt: new Date(2026, 9, 28, 18), durationSeconds: 300 });

    expect(await getStats(db)).toEqual({
      totalSeconds: 2280,
      sessionCount: 4,
      currentStreak: 3,
      longestStreak: 3,
      trainedToday: true,
      firstSessionDate: '2026-10-26',
    });
    expect(await getTotalSeconds(db)).toBe(2280);
  });

  it('deletes all sessions', async () => {
    await logSession(db, { startedAt: new Date(2026, 9, 28, 8), durationSeconds: 600 });

    await deleteAllSessions(db);

    expect(await getTotalSeconds(db)).toBe(0);
  });
});
