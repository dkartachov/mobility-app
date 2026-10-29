import type { SQLiteDatabase } from 'expo-sqlite';

import { addDays, daysBetween, toDateKey, todayKey, type DateKey } from '@/lib/dates';

import { useDbQuery } from './use-db-query';

export type Stats = {
  totalSeconds: number;
  sessionCount: number;
  currentStreak: number;
  longestStreak: number;
  trainedToday: boolean;
  /** Day of the very first session, `null` before any. */
  firstSessionDate: DateKey | null;
};

export async function logSession(
  db: SQLiteDatabase,
  { startedAt, durationSeconds, routineId = null }: {
    startedAt: Date;
    durationSeconds: number;
    routineId?: string | null;
  }
) {
  await db.runAsync(
    'INSERT INTO sessions (started_at, local_date, duration_seconds, routine_id) VALUES (?, ?, ?, ?)',
    startedAt.toISOString(),
    toDateKey(startedAt),
    durationSeconds,
    routineId
  );
}

export async function getTotalSeconds(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ total: number | null }>('SELECT SUM(duration_seconds) AS total FROM sessions');
  return row?.total ?? 0;
}

export async function deleteAllSessions(db: SQLiteDatabase) {
  // The WHERE clause is deliberate: a bare `DELETE FROM` uses SQLite's truncate optimization,
  // which skips the change hook, so `useDbQuery` screens would never refresh.
  await db.runAsync('DELETE FROM sessions WHERE id IS NOT NULL');
}

/**
 * A day counts towards a streak if it has at least one session. The current streak stays
 * alive through today if yesterday was trained, so it only resets after a full missed day.
 */
export function computeStreaks(sortedDays: DateKey[], today: DateKey) {
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    run = i > 0 && daysBetween(sortedDays[i - 1], sortedDays[i]) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const days = new Set(sortedDays);
  let current = 0;
  let cursor = days.has(today) ? today : addDays(today, -1);
  while (days.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  return { current, longest, trainedToday: days.has(today) };
}

export async function getStats(db: SQLiteDatabase): Promise<Stats> {
  const totals = await db.getFirstAsync<{ total: number | null; count: number }>(
    'SELECT SUM(duration_seconds) AS total, COUNT(*) AS count FROM sessions'
  );
  const days = await db.getAllAsync<{ local_date: string }>(
    'SELECT DISTINCT local_date FROM sessions ORDER BY local_date'
  );
  const streaks = computeStreaks(
    days.map((d) => d.local_date),
    todayKey()
  );

  return {
    totalSeconds: totals?.total ?? 0,
    sessionCount: totals?.count ?? 0,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    trainedToday: streaks.trainedToday,
    firstSessionDate: days[0]?.local_date ?? null,
  };
}

export function useStats() {
  return useDbQuery(getStats, ['sessions']);
}

export const WEEK_DAYS = 7;

/** The last seven days ending today, oldest first, each with whether it had a session. */
export async function getRecentDays(db: SQLiteDatabase): Promise<{ date: DateKey; trained: boolean }[]> {
  const today = todayKey();
  const from = addDays(today, -(WEEK_DAYS - 1));
  const rows = await db.getAllAsync<{ local_date: string }>(
    'SELECT DISTINCT local_date FROM sessions WHERE local_date >= ?',
    from
  );
  const trained = new Set(rows.map((row) => row.local_date));
  return Array.from({ length: WEEK_DAYS }, (_, i) => {
    const date = addDays(from, i);
    return { date, trained: trained.has(date) };
  });
}

export function useRecentDays() {
  return useDbQuery(getRecentDays, ['sessions']);
}
