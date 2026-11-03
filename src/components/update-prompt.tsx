import { usePathname } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { showDialog, useDialogOpen } from './dialog';

/**
 * Screens a restart shouldn't interrupt: sessions and forms have progress to lose, Settings runs
 * backup restores, and iOS can't present a dialog over the `presentation: 'modal'` ones.
 */
const HOLD_PATHS = ['/workout', '/mobility-test', '/edit-profile', '/new-goal', '/settings'];

async function downloadUpdate() {
  try {
    const { isAvailable } = await Updates.checkForUpdateAsync();
    if (isAvailable) await Updates.fetchUpdateAsync();
  } catch {
    // Offline, or a development build, where these always reject. The next foreground tries again.
  }
}

async function restart() {
  try {
    await Updates.reloadAsync();
  } catch {
    // The downloaded update still applies on the next cold start.
  }
}

/**
 * Downloads over-the-air updates whenever the app opens, and offers a restart once one is ready.
 * A launch already checks and downloads by itself, so only coming back to the foreground needs a
 * check here, and `isUpdatePending` covers both. Saying later asks again next time the app opens.
 * Renders nothing.
 */
export function UpdatePrompt() {
  const { isUpdatePending, isChecking, isDownloading } = Updates.useUpdates();
  const held = HOLD_PATHS.includes(usePathname());
  // `showDialog` replaces whatever's showing, which could be a choice the user is halfway through.
  const dialogOpen = useDialogOpen();
  const [dismissed, setDismissed] = useState(false);

  const canDownload = Updates.isEnabled && !isUpdatePending && !isChecking && !isDownloading;

  useEffect(() => {
    const appState = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      setDismissed(false);
      if (canDownload) downloadUpdate();
    });
    return () => appState.remove();
  }, [canDownload]);

  const shouldPrompt = isUpdatePending && !held && !dialogOpen && !dismissed;

  useEffect(() => {
    if (!shouldPrompt) return;
    const dismiss = () => setDismissed(true);
    showDialog({
      title: 'Update ready',
      message: 'Restart Plie to get the latest version.',
      actions: [
        {
          label: 'Restart',
          variant: 'primary',
          onPress: () => {
            dismiss();
            restart();
          },
        },
        { label: 'Later', variant: 'secondary', onPress: dismiss },
      ],
      onDismiss: dismiss,
    });
  }, [shouldPrompt]);

  return null;
}
