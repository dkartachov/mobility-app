import type { SQLiteDatabase } from 'expo-sqlite';

import { createReminder } from '@/db/reminders';
import { createTestDb } from '@/test-utils/sqlite';

import {
  countWorkoutForReminderPrompt,
  neverShowReminderPrompt,
  REMINDER_PROMPT_SNOOZE_WORKOUTS,
  resetReminderPrompt,
  shouldShowReminderPrompt,
  snoozeReminderPrompt,
} from './reminder-prompt';

describe('shouldShowReminderPrompt', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    resetReminderPrompt();
    db = await createTestDb();
  });

  it('shows while there are no reminders', async () => {
    expect(await shouldShowReminderPrompt(db)).toBe(true);
  });

  it('stays hidden once a reminder exists', async () => {
    await createReminder(db, 18, 0);

    expect(await shouldShowReminderPrompt(db)).toBe(false);
  });

  it('stays hidden forever after "never", however many workouts follow', async () => {
    neverShowReminderPrompt();
    for (let i = 0; i < 10; i++) countWorkoutForReminderPrompt();

    expect(await shouldShowReminderPrompt(db)).toBe(false);
  });

  it('comes back only after the snoozed number of workouts', async () => {
    snoozeReminderPrompt();

    for (let i = 0; i < REMINDER_PROMPT_SNOOZE_WORKOUTS; i++) {
      expect(await shouldShowReminderPrompt(db)).toBe(false);
      countWorkoutForReminderPrompt();
    }

    expect(await shouldShowReminderPrompt(db)).toBe(true);
  });

  it('keeps showing if extra workouts pass without an answer', async () => {
    countWorkoutForReminderPrompt();
    countWorkoutForReminderPrompt();

    expect(await shouldShowReminderPrompt(db)).toBe(true);
  });
});
