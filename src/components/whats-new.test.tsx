import { act, fireEvent, screen } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';
import { router, Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { clearGreeting, setGreeting } from '@/lib/greeting';

import { DialogHost, showDialog } from './dialog';
import { WhatsNew } from './whats-new';

jest.mock('@/data/whats-new', () => ({
  RELEASES: [
    { id: 2, notes: ['Hip flexibility test'] },
    { id: 1, notes: ['Workout reminders'] },
  ],
}));

const Screen = () => <Text>screen</Text>;

const routes = {
  _layout: () => (
    <>
      <WhatsNew />
      <Stack />
      <DialogHost />
    </>
  ),
  index: Screen,
  workout: Screen,
};

describe('WhatsNew', () => {
  beforeEach(() => {
    Storage.clearSync();
    clearGreeting();
  });

  afterEach(async () => {
    // The dialog's state outlives each test, so close it for the next one.
    const button = screen.queryByRole('button', { name: /Got it|Cancel/ });
    if (button) await fireEvent.press(button);
  });

  it('lists the notes since the last release seen, once', async () => {
    Storage.setItemSync('whatsNew.lastSeen', '0');
    await renderRouter(routes, { initialUrl: '/' });

    expect(screen.getByText("What's new")).toBeTruthy();
    expect(screen.getByText('• Hip flexibility test\n• Workout reminders')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByText("What's new")).toBeNull();
    expect(Storage.getItemSync('whatsNew.lastSeen')).toBe('2');
  });

  it('stays quiet when everything has been seen', async () => {
    Storage.setItemSync('whatsNew.lastSeen', '2');

    await renderRouter(routes, { initialUrl: '/' });

    expect(screen.queryByText("What's new")).toBeNull();
  });

  it('waits for the welcome screen to finish', async () => {
    setGreeting('returning');
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.queryByText("What's new")).toBeNull();

    await act(async () => clearGreeting());

    expect(screen.getByText("What's new")).toBeTruthy();
  });

  it('skips the notes for someone who just made their profile', async () => {
    setGreeting('new');
    await renderRouter(routes, { initialUrl: '/' });

    await act(async () => clearGreeting());

    expect(screen.queryByText("What's new")).toBeNull();
    expect(Storage.getItemSync('whatsNew.lastSeen')).toBe('2');
  });

  it('waits until a held screen closes', async () => {
    await renderRouter(routes, { initialUrl: '/workout' });
    expect(screen.queryByText("What's new")).toBeNull();

    await act(async () => router.replace('/'));

    expect(screen.getByText("What's new")).toBeTruthy();
  });

  it("doesn't replace a dialog that's already open", async () => {
    await act(async () => showDialog({ title: 'Delete?', message: '', confirm: { label: 'Delete', onPress: () => {} } }));
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByText('Delete?')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText("What's new")).toBeTruthy();
  });
});
