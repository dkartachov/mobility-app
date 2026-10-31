import type { SQLiteDatabase } from 'expo-sqlite';

import type { DialogOptions } from '@/components/dialog';
import { createReminder } from '@/db/reminders';
import {
  countWorkoutForReminderPrompt,
  REMINDER_PROMPT_SNOOZE_WORKOUTS,
  resetReminderPrompt,
  shouldShowReminderPrompt,
} from '@/lib/reminder-prompt';
import { createTestDb } from '@/test-utils/sqlite';

import { promptForReminderIfDue } from './reminder-prompt';

const mockShowDialog = jest.fn<void, [DialogOptions]>();
const mockPush = jest.fn();

jest.mock('@/components/dialog', () => ({ showDialog: (options: DialogOptions) => mockShowDialog(options) }));
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

describe('promptForReminderIfDue', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    jest.clearAllMocks();
    resetReminderPrompt();
    db = await createTestDb();
  });

  async function prompt() {
    await promptForReminderIfDue(db);
    return mockShowDialog.mock.calls[0][0];
  }

  function action(options: DialogOptions, label: string) {
    return options.actions!.find((a) => a.label === label)!;
  }

  async function expectSnoozed() {
    for (let i = 0; i < REMINDER_PROMPT_SNOOZE_WORKOUTS; i++) {
      expect(await shouldShowReminderPrompt(db)).toBe(false);
      countWorkoutForReminderPrompt();
    }
    expect(await shouldShowReminderPrompt(db)).toBe(true);
  }

  it('says nothing when a reminder exists', async () => {
    await createReminder(db, 18, 0);

    await promptForReminderIfDue(db);

    expect(mockShowDialog).not.toHaveBeenCalled();
  });

  it('mentions where reminders live', async () => {
    expect((await prompt()).message).toContain('Settings');
  });

  it('accepting opens the reminders section of Settings and snoozes', async () => {
    action(await prompt(), 'Set a reminder').onPress();

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings', params: { section: 'reminders' } });
    await expectSnoozed();
  });

  it('"Later" snoozes', async () => {
    action(await prompt(), 'Later').onPress();

    await expectSnoozed();
  });

  it('dismissing with the backdrop or back button counts as "Later"', async () => {
    (await prompt()).onDismiss!();

    await expectSnoozed();
  });

  it('"Don\'t ask again" is permanent', async () => {
    action(await prompt(), "Don't ask again").onPress();
    for (let i = 0; i < 10; i++) countWorkoutForReminderPrompt();

    expect(await shouldShowReminderPrompt(db)).toBe(false);
  });
});
