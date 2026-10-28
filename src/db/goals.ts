import type { SQLiteDatabase } from 'expo-sqlite';

import { addDays, todayKey, type DateKey } from '@/lib/dates';

import { useDbQuery } from './use-db-query';

/** Every goal is "X hours within 30 days of its start date". */
export const GOAL_PERIOD_DAYS = 30;

export type GoalStatus = 'active' | 'completed' | 'expired';

export type Goal = {
  id: number;
  title: string;
  targetMinutes: number;
  startDate: DateKey;
  /** Last day (inclusive) that counts towards the goal. */
  endDate: DateKey;
  progressSeconds: number;
  status: GoalStatus;
};

type GoalRow = {
  id: number;
  title: string;
  target_minutes: number;
  start_date: string;
  progress_seconds: number;
};

export async function getGoals(db: SQLiteDatabase): Promise<Goal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    `SELECT g.id, g.title, g.target_minutes, g.start_date,
       COALESCE((
         SELECT SUM(s.duration_seconds) FROM sessions s
         WHERE s.local_date BETWEEN g.start_date AND date(g.start_date, '+${GOAL_PERIOD_DAYS - 1} days')
       ), 0) AS progress_seconds
     FROM goals g
     ORDER BY g.start_date DESC, g.id DESC`
  );

  const today = todayKey();
  const goals = rows.map((row): Goal => {
    const endDate = addDays(row.start_date, GOAL_PERIOD_DAYS - 1);
    const done = row.progress_seconds >= row.target_minutes * 60;
    return {
      id: row.id,
      title: row.title,
      targetMinutes: row.target_minutes,
      startDate: row.start_date,
      endDate,
      progressSeconds: row.progress_seconds,
      status: done ? 'completed' : today > endDate ? 'expired' : 'active',
    };
  });

  const order: Record<GoalStatus, number> = { active: 0, completed: 1, expired: 2 };
  return goals.sort((a, b) => order[a.status] - order[b.status]);
}

export async function createGoal(db: SQLiteDatabase, targetHours: number) {
  await db.runAsync(
    'INSERT INTO goals (title, target_minutes, start_date, created_at) VALUES (?, ?, ?, ?)',
    `${targetHours}h in ${GOAL_PERIOD_DAYS} days`,
    Math.round(targetHours * 60),
    todayKey(),
    new Date().toISOString()
  );
}

export async function deleteGoal(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM goals WHERE id = ?', id);
}

export function useGoals() {
  return useDbQuery(getGoals, ['goals', 'sessions']);
}
