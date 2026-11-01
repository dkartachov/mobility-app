import { act, fireEvent, screen } from '@testing-library/react-native';
import { router, Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { AppState, Text, type AppStateStatus } from 'react-native';

import { DialogHost, showDialog } from './dialog';
import { UpdatePrompt } from './update-prompt';

const mockUpdates = {
  pending: false,
  listeners: new Set<() => void>(),
  check: jest.fn(),
  fetch: jest.fn(),
  reload: jest.fn(),
};

function setPending(pending: boolean) {
  mockUpdates.pending = pending;
  mockUpdates.listeners.forEach((listener) => listener());
}

jest.mock('expo-updates', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  return {
    isEnabled: true,
    checkForUpdateAsync: () => mockUpdates.check(),
    fetchUpdateAsync: () => mockUpdates.fetch(),
    reloadAsync: () => mockUpdates.reload(),
    useUpdates: () => ({
      isChecking: false,
      isDownloading: false,
      isUpdatePending: useSyncExternalStore(
        (listener: () => void) => {
          mockUpdates.listeners.add(listener);
          return () => mockUpdates.listeners.delete(listener);
        },
        () => mockUpdates.pending
      ),
    }),
  };
});

const Screen = () => <Text>screen</Text>;

const routes = {
  _layout: () => (
    <>
      <UpdatePrompt />
      <Stack />
      <DialogHost />
    </>
  ),
  index: Screen,
  workout: Screen,
  'mobility-test': Screen,
  'edit-profile': Screen,
  'new-goal': Screen,
  settings: Screen,
};

const appStateListeners = new Set<(state: AppStateStatus) => void>();

async function foreground() {
  await act(async () => appStateListeners.forEach((listener) => listener('active')));
}

describe('UpdatePrompt', () => {
  beforeEach(() => {
    mockUpdates.pending = false;
    mockUpdates.check.mockReset().mockResolvedValue({ isAvailable: false });
    mockUpdates.fetch.mockReset().mockResolvedValue({ isNew: true });
    mockUpdates.reload.mockReset().mockResolvedValue(undefined);
    appStateListeners.clear();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListeners.add(listener);
      return { remove: () => appStateListeners.delete(listener) };
    });
  });

  afterEach(async () => {
    // The dialog's state outlives each test, so close it for the next one.
    const later = screen.queryByRole('button', { name: 'Later' });
    if (later) await fireEvent.press(later);
    jest.restoreAllMocks();
  });

  it('downloads an available update when the app comes to the foreground', async () => {
    mockUpdates.check.mockResolvedValue({ isAvailable: true });
    await renderRouter(routes, { initialUrl: '/' });
    expect(mockUpdates.check).not.toHaveBeenCalled();

    await foreground();

    expect(mockUpdates.fetch).toHaveBeenCalledTimes(1);
  });

  it("doesn't download when there's nothing new", async () => {
    await renderRouter(routes, { initialUrl: '/' });

    await foreground();

    expect(mockUpdates.check).toHaveBeenCalledTimes(1);
    expect(mockUpdates.fetch).not.toHaveBeenCalled();
  });

  it('stays quiet when the check fails, as it does offline', async () => {
    mockUpdates.check.mockRejectedValue(new Error('offline'));
    await renderRouter(routes, { initialUrl: '/' });

    await foreground();

    expect(screen.queryByText('Update ready')).toBeNull();
  });

  it("doesn't check again while a download is waiting for a restart", async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await act(async () => setPending(true));

    await foreground();

    expect(mockUpdates.check).not.toHaveBeenCalled();
  });

  it('restarts into the update when asked to', async () => {
    await renderRouter(routes, { initialUrl: '/' });

    await act(async () => setPending(true));
    await fireEvent.press(screen.getByRole('button', { name: 'Restart' }));

    expect(mockUpdates.reload).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Update ready')).toBeNull();
  });

  it('prompts for an update already downloaded when it mounts', async () => {
    mockUpdates.pending = true;

    await renderRouter(routes, { initialUrl: '/' });

    expect(screen.getByText('Update ready')).toBeTruthy();
  });

  it('asks again the next time the app opens after saying later', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await act(async () => setPending(true));

    await fireEvent.press(screen.getByRole('button', { name: 'Later' }));
    expect(screen.queryByText('Update ready')).toBeNull();
    expect(mockUpdates.reload).not.toHaveBeenCalled();

    await foreground();
    expect(screen.getByText('Update ready')).toBeTruthy();
  });

  it.each(['/workout', '/mobility-test', '/edit-profile', '/new-goal', '/settings'] as const)(
    'holds the prompt on %s until it closes',
    async (pathname) => {
      await renderRouter(routes, { initialUrl: '/' });
      await act(async () => router.push(pathname));

      await act(async () => setPending(true));
      expect(screen.queryByText('Update ready')).toBeNull();

      await act(async () => router.back());
      expect(screen.getByText('Update ready')).toBeTruthy();
    }
  );

  it("doesn't replace a dialog that's already open, and prompts once it closes", async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await act(async () => showDialog({ title: 'Delete?', message: '', confirm: { label: 'Delete', onPress: () => {} } }));

    await act(async () => setPending(true));
    expect(screen.getByText('Delete?')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Update ready')).toBeTruthy();
  });
});
