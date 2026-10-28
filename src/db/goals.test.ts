import type { SQLiteDatabase } from 'expo-sqlite';

import { createTestDb } from '@/test-utils/sqlite';

import { createGoal, deleteGoal, getGoals, GOAL_PERIOD_DAYS } from './goals';
import { logSession } from './sessions';

describe('goals', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(() => jest.useRealTimers());

  function setToday(year: number, month: number, day: number) {
    jest.useFakeTimers({ now: new Date(year, month - 1, day, 12) });
  }

  it('creates a goal starting today and lasting the goal period', async () => {
    setToday(2026, 10, 1);
    await createGoal(db, 1.5);

    expect(await getGoals(db)).toEqual([
      {
        id: 1,
        title: `1.5h in ${GOAL_PERIOD_DAYS} days`,
        targetMinutes: 90,
        startDate: '2026-10-01',
        endDate: '2026-10-30',
        progressSeconds: 0,
        status: 'active',
      },
    ]);
  });

  it('only counts sessions inside the goal window', async () => {
    setToday(2026, 10, 1);
    await createGoal(db, 10);
    await logSession(db, { startedAt: new Date(2026, 8, 30, 12), durationSeconds: 1000 });
    await logSession(db, { startedAt: new Date(2026, 9, 1, 12), durationSeconds: 60 });
    await logSession(db, { startedAt: new Date(2026, 9, 30, 12), durationSeconds: 120 });
    await logSession(db, { startedAt: new Date(2026, 9, 31, 12), durationSeconds: 1000 });

    const [goal] = await getGoals(db);
    expect(goal.progressSeconds).toBe(180);
  });

  it('completes a goal once the target is reached', async () => {
    setToday(2026, 10, 1);
    await createGoal(db, 1);
    await logSession(db, { startedAt: new Date(2026, 9, 2, 12), durationSeconds: 3600 });

    expect((await getGoals(db))[0].status).toBe('completed');
  });

  it('expires an unfinished goal after its last day', async () => {
    setToday(2026, 10, 1);
    await createGoal(db, 1);

    setToday(2026, 10, 30);
    expect((await getGoals(db))[0].status).toBe('active');
    setToday(2026, 10, 31);
    expect((await getGoals(db))[0].status).toBe('expired');
  });

  it('lists active goals first, then completed, then expired', async () => {
    setToday(2026, 8, 1);
    await createGoal(db, 100); // expires
    setToday(2026, 9, 1);
    await createGoal(db, 0.5); // completes
    await logSession(db, { startedAt: new Date(2026, 8, 1, 12), durationSeconds: 1800 });
    setToday(2026, 10, 28);
    await createGoal(db, 5); // active

    expect((await getGoals(db)).map((g) => g.status)).toEqual(['active', 'completed', 'expired']);
  });

  it('deletes a goal', async () => {
    setToday(2026, 10, 1);
    await createGoal(db, 1);
    await createGoal(db, 2);

    await deleteGoal(db, 1);

    expect((await getGoals(db)).map((g) => g.id)).toEqual([2]);
  });
});
