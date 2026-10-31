import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import type { Reminder } from '@/db/reminders';
import { formatTimeOfDay } from '@/lib/dates';

import { RemindersCard } from './reminders-card';

const mockDb = {};
const mockReminders = { value: [] as Reminder[] };
const mockCreateReminder = jest.fn(async () => 1);
const mockUpdateReminder = jest.fn();
const mockDeleteReminder = jest.fn();
const mockPermission = { value: { granted: true, canAskAgain: true } };
const mockRequestPermission = jest.fn(async () => mockPermission.value);

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-notifications', () => ({ getPermissionsAsync: async () => mockPermission.value }));

jest.mock('@/db/reminders', () => ({
  ...jest.requireActual('@/db/reminders'),
  useReminders: () => mockReminders.value,
  createReminder: (...args: unknown[]) => (mockCreateReminder as jest.Mock)(...args),
  updateReminder: (...args: unknown[]) => mockUpdateReminder(...args),
  deleteReminder: (...args: unknown[]) => mockDeleteReminder(...args),
}));

jest.mock('@/lib/reminders', () => ({
  isNotificationPermissionGranted: (status: { granted: boolean }) => status.granted,
  requestNotificationPermission: () => mockRequestPermission(),
}));

const reminder: Reminder = { id: 7, hour: 18, minute: 30, weekdays: [2, 3], enabled: true };
const time = formatTimeOfDay(18, 30);

describe('RemindersCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReminders.value = [];
    mockPermission.value = { granted: true, canAskAgain: true };
  });

  it('adds a reminder and asks for permission', async () => {
    await render(<RemindersCard />);

    await fireEvent.press(screen.getByRole('button', { name: 'Add reminder' }));

    await waitFor(() => expect(mockRequestPermission).toHaveBeenCalled());
    expect(mockCreateReminder).toHaveBeenCalledWith(mockDb, 18, 0);
  });

  it('saves a toggled weekday', async () => {
    mockReminders.value = [reminder];
    await render(<RemindersCard />);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Friday' }));

    expect(mockUpdateReminder).toHaveBeenCalledWith(mockDb, { ...reminder, weekdays: [2, 3, 6] });
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('asks for permission when a reminder is turned on, not off', async () => {
    mockReminders.value = [reminder];
    await render(<RemindersCard />);
    const toggle = screen.getByRole('switch', { name: `${time} reminder` });

    await fireEvent(toggle, 'valueChange', false);
    expect(mockUpdateReminder).toHaveBeenLastCalledWith(mockDb, { ...reminder, enabled: false });
    expect(mockRequestPermission).not.toHaveBeenCalled();

    await fireEvent(toggle, 'valueChange', true);
    expect(mockUpdateReminder).toHaveBeenLastCalledWith(mockDb, reminder);
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('deletes a reminder', async () => {
    mockReminders.value = [reminder];
    await render(<RemindersCard />);

    await fireEvent.press(screen.getByRole('button', { name: `Delete ${time} reminder` }));

    expect(mockDeleteReminder).toHaveBeenCalledWith(mockDb, 7);
  });

  it('warns about missing permission, and opens settings once it can no longer ask', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    mockReminders.value = [reminder];
    mockPermission.value = { granted: false, canAskAgain: false };
    await render(<RemindersCard />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Allow notifications' }));

    await waitFor(() => expect(openSettings).toHaveBeenCalled());
  });

  it('does not warn when every reminder is off', async () => {
    mockReminders.value = [{ ...reminder, enabled: false }];
    mockPermission.value = { granted: false, canAskAgain: true };
    await render(<RemindersCard />);

    await waitFor(() => expect(screen.getByText(time)).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Allow notifications' })).toBeNull();
  });
});
