import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useGreeting } from '@/lib/greeting';
import { getUnseenNotes, markWhatsNewSeen } from '@/lib/whats-new';

import { showDialog, useDialogOpen } from './dialog';
import { HOLD_PATHS } from './update-prompt';

/**
 * Shows the notes for releases this phone hasn't seen, once, the first time the app opens after an
 * update. Waits for the welcome screen, held screens and other dialogs, like `UpdatePrompt`. Someone
 * who just made their profile is new to everything, so they skip straight to having seen it all.
 * Renders nothing.
 */
export function WhatsNew() {
  const greeting = useGreeting();
  const held = HOLD_PATHS.includes(usePathname());
  const dialogOpen = useDialogOpen();
  // Read once, so marking them seen doesn't change what's showing.
  const [notes] = useState(getUnseenNotes);
  const done = useRef(false);

  useEffect(() => {
    if (greeting !== 'new') return;
    done.current = true;
    markWhatsNewSeen();
  }, [greeting]);

  const shouldShow = notes.length > 0 && greeting === null && !held && !dialogOpen;

  useEffect(() => {
    if (!shouldShow || done.current) return;
    done.current = true;
    // Seen as soon as it's up, so closing the app over it doesn't bring it back.
    markWhatsNewSeen();
    showDialog({
      title: "What's new",
      message: notes.map((note) => `• ${note}`).join('\n'),
      cancelLabel: 'Got it',
    });
  }, [shouldShow, notes]);

  return null;
}
