import { router } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';

import { showDialog } from '@/components/dialog';
import { neverShowReminderPrompt, shouldShowReminderPrompt, snoozeReminderPrompt } from '@/lib/reminder-prompt';

/**
 * Suggests setting a reminder, if it's time to. Going to Settings snoozes too, otherwise leaving
 * without adding one would bring this back after the very next workout.
 */
export async function promptForReminderIfDue(db: SQLiteDatabase) {
  if (!(await shouldShowReminderPrompt(db))) return;
  showDialog({
    title: 'Set a reminder?',
    message: 'A nudge at a time that suits you makes it easier to keep going. You can always find reminders in Settings.',
    actions: [
      {
        label: 'Set a reminder',
        variant: 'primary',
        onPress: () => {
          snoozeReminderPrompt();
          router.push({ pathname: '/settings', params: { section: 'reminders' } });
        },
      },
      { label: 'Later', variant: 'secondary', onPress: snoozeReminderPrompt },
      { label: "Don't ask again", variant: 'secondary', onPress: neverShowReminderPrompt },
    ],
    onDismiss: snoozeReminderPrompt,
  });
}
