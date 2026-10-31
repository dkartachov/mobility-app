import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback } from 'react';

import { addDays, addMonths, startOfWeek, toDateKey, todayKey, type DateKey } from '@/lib/dates';

import { useDbQuery } from './use-db-query';

export type Stats = {
  totalSeconds: number;
  sessionCount: number;
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

export async function getStats(db: SQLiteDatabase): Promise<Stats> {
  const row = await db.getFirstAsync<{
    total: number | null;
    count: number;
    today: number | null;
    first: string | null;
  }>(
    `SELECT SUM(duration_seconds) AS total, COUNT(*) AS count, SUM(local_date = ?) AS today, MIN(local_date) AS first
     FROM sessions`,
    todayKey()
  );

  return {
    totalSeconds: row?.total ?? 0,
    sessionCount: row?.count ?? 0,
    trainedToday: (row?.today ?? 0) > 0,
    firstSessionDate: row?.first ?? null,
  };
}

export function useStats() {
  return useDbQuery(getStats, ['sessions']);
}

export const WEEK_DAYS = 7;

/** This week from Monday to Sunday, each day with whether it had a session. */
export async function getWeekDays(db: SQLiteDatabase): Promise<{ date: DateKey; trained: boolean }[]> {
  const from = startOfWeek(todayKey());
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

export function useWeekDays() {
  return useDbQuery(getWeekDays, ['sessions']);
}

export type TrainingDay = {
  date: DateKey;
  sessions: number;
  seconds: number;
};

/** The days with a session in `month`, given as its first day, oldest first. */
export async function getMonthTrainingDays(db: SQLiteDatabase, month: DateKey): Promise<TrainingDay[]> {
  return db.getAllAsync<TrainingDay>(
    `SELECT local_date AS date, COUNT(*) AS sessions, SUM(duration_seconds) AS seconds
     FROM sessions
     WHERE local_date >= ? AND local_date < ?
     GROUP BY local_date
     ORDER BY local_date`,
    month,
    addMonths(month, 1)
  );
}

export function useMonthTrainingDays(month: DateKey) {
  const query = useCallback((db: SQLiteDatabase) => getMonthTrainingDays(db, month), [month]);
  return useDbQuery(query, ['sessions']);
}
