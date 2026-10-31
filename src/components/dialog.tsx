import { useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { Button } from './button';
import { Card } from './card';
import { ThemedText } from './themed-text';

export type DialogOptions = {
  title: string;
  message: string;
  /** The button that closes the dialog without doing anything. Defaults to Cancel, or OK without `confirm`. */
  cancelLabel?: string;
  /** The destructive choice. Without it, the dialog is only a message to dismiss. */
  confirm?: { label: string; onPress: () => void };
  /** Replaces the buttons above, for a choice that isn't between doing something and cancelling. */
  actions?: { label: string; variant: 'primary' | 'secondary'; onPress: () => void }[];
  /** Runs when the dialog closes without an action: its cancel button, the backdrop or Android's back. */
  onDismiss?: () => void;
};

/** `options` outlives `visible`, so the dialog keeps its contents while it fades out. */
let state: { options: DialogOptions | null; visible: boolean } = { options: null, visible: false };
const listeners = new Set<() => void>();

function setState(next: typeof state) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getState() {
  return state;
}

/** Shows a dialog from anywhere, including outside React. Needs `DialogHost` mounted. */
export function showDialog(options: DialogOptions) {
  setState({ options, visible: true });
}

function closeDialog() {
  setState({ ...state, visible: false });
}

/**
 * Renders the dialog from `showDialog`. Lives in the root layout, under which iOS can't present it
 * over a `presentation: 'modal'` screen, so don't show dialogs from those.
 */
export function DialogHost() {
  const { options, visible } = useSyncExternalStore(subscribe, getState);
  if (!options) return null;

  const { title, message, confirm, cancelLabel = confirm ? 'Cancel' : 'OK', actions, onDismiss } = options;

  // The buttons stay pressable while fading out, and a double tap mustn't run the action twice.
  const closeAndRun = (action?: () => void) => {
    if (!getState().visible) return;
    closeDialog();
    action?.();
  };
  const dismiss = () => closeAndRun(onDismiss);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <Pressable accessible={false} onPress={dismiss} style={styles.backdrop} />
        <Card accessibilityRole="alert" style={styles.card}>
          <ThemedText type="subtitle" accessibilityRole="header">
            {title}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{message}</ThemedText>
          <View style={styles.buttons}>
            {actions ? (
              actions.map(({ label, variant, onPress }) => (
                <Button key={label} title={label} variant={variant} onPress={() => closeAndRun(onPress)} />
              ))
            ) : (
              <>
                {confirm && (
                  <Button title={confirm.label} variant="destructive" onPress={() => closeAndRun(confirm.onPress)} />
                )}
                <Button title={cancelLabel} variant="secondary" onPress={dismiss} />
              </>
            )}
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  buttons: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
