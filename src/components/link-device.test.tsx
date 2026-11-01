import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { reloadAppAsync } from 'expo';

import { formatDateKey } from '@/lib/dates';

import { LinkDevice } from './link-device';

const mockDb = {};
const mockUnsaved = { value: false };
const mockLinkDevice = jest.fn();
const mockListSnapshots = jest.fn();
const mockRestoreSnapshot = jest.fn();
const mockShowDialog = jest.fn();
const mockSignOut = jest.fn();
const mockSetGreeting = jest.fn();
const mockLocalName = { value: '' };

jest.mock('expo', () => ({ ...jest.requireActual('expo'), reloadAppAsync: jest.fn() }));
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@/components/dialog', () => ({ showDialog: (...args: unknown[]) => mockShowDialog(...args) }));
jest.mock('@/db/profile', () => ({
  ...jest.requireActual('@/db/profile'),
  getProfile: async () => ({ firstName: mockLocalName.value }),
}));
jest.mock('@/lib/auth', () => ({ syncDisplayName: jest.fn() }));
jest.mock('@/lib/greeting', () => ({ setGreeting: (...args: unknown[]) => mockSetGreeting(...args) }));
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: (...args: unknown[]) => mockSignOut(...args) } } }));
jest.mock('@/lib/backup', () => ({
  hasUnsavedChanges: () => mockUnsaved.value,
  linkDevice: (...args: unknown[]) => mockLinkDevice(...args),
  listSnapshots: () => mockListSnapshots(),
  restoreSnapshot: (...args: unknown[]) => mockRestoreSnapshot(...args),
}));

describe('LinkDevice', () => {
  beforeEach(() => {
    mockUnsaved.value = false;
    mockLinkDevice.mockClear();
    mockListSnapshots.mockReset();
    mockRestoreSnapshot.mockReset().mockResolvedValue(undefined);
    mockShowDialog.mockClear();
    mockSignOut.mockClear();
    mockSetGreeting.mockClear();
    mockLocalName.value = '';
    jest.mocked(reloadAppAsync).mockClear();
  });

  it('asks a new user for a profile before linking', async () => {
    mockListSnapshots.mockResolvedValue([]);
    await render(<LinkDevice />);
    expect(await screen.findByText('Create your profile')).toBeTruthy();
    expect(mockLinkDevice).not.toHaveBeenCalled();
    expect(mockRestoreSnapshot).not.toHaveBeenCalled();
  });

  it('starts backing up, greeting them back, when the phone already has a name but there is no backup', async () => {
    mockLocalName.value = 'Ada';
    mockListSnapshots.mockResolvedValue([]);
    await render(<LinkDevice />);
    await waitFor(() => expect(mockLinkDevice).toHaveBeenCalledWith(mockDb));
    expect(mockSetGreeting).toHaveBeenCalledWith('returning');
    expect(screen.queryByText('Create your profile')).toBeNull();
  });

  it('shows no words while it checks for a backup', async () => {
    mockListSnapshots.mockReturnValue(new Promise(() => {}));
    await render(<LinkDevice />);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(screen.queryByText(/backup/i)).toBeNull();
  });

  it('restores the latest backup without asking on a fresh install', async () => {
    mockListSnapshots.mockResolvedValue(['2026-01-02', '2026-01-01']);
    await render(<LinkDevice />);
    await waitFor(() => expect(reloadAppAsync).toHaveBeenCalled());
    expect(mockRestoreSnapshot).toHaveBeenCalledTimes(1);
    expect(mockRestoreSnapshot).toHaveBeenCalledWith(mockDb, '2026-01-02');
    expect(mockSetGreeting).toHaveBeenCalledWith('returning');
    expect(mockShowDialog).not.toHaveBeenCalled();
    expect(mockLinkDevice).not.toHaveBeenCalled();
  });

  it('asks before touching anything when the phone has data of its own', async () => {
    mockUnsaved.value = true;
    mockListSnapshots.mockResolvedValue(['2026-01-02']);
    await render(<LinkDevice />);
    await waitFor(() => expect(screen.getByText(new RegExp(formatDateKey('2026-01-02')))).toBeTruthy());
    expect(screen.getByText(/replaces the backup in the cloud/)).toBeTruthy();
    expect(mockRestoreSnapshot).not.toHaveBeenCalled();
    expect(mockLinkDevice).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: "Keep this phone's data" }));
    await mockShowDialog.mock.calls[0][0].confirm.onPress();
    expect(mockLinkDevice).toHaveBeenCalledWith(mockDb);
  });

  it('restores after confirming, when the phone has data of its own', async () => {
    mockUnsaved.value = true;
    mockListSnapshots.mockResolvedValue(['2026-01-02']);
    await render(<LinkDevice />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Restore backup' }));
    await mockShowDialog.mock.calls[0][0].confirm.onPress();
    expect(mockRestoreSnapshot).toHaveBeenCalledWith(mockDb, '2026-01-02');
  });

  it('offers to retry or start without a backup that fails to restore', async () => {
    mockListSnapshots.mockResolvedValue(['2026-01-02']);
    mockRestoreSnapshot.mockRejectedValue(new Error('This backup is damaged'));
    await render(<LinkDevice />);
    await waitFor(() => expect(screen.getByText(/This backup is damaged/)).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start without it' })).toBeTruthy();
    expect(mockLinkDevice).not.toHaveBeenCalled();
    expect(mockSetGreeting).not.toHaveBeenCalled();
  });

  it("stays locked when it can't check for a backup", async () => {
    mockLocalName.value = 'Ada';
    mockListSnapshots.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    await render(<LinkDevice />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mockLinkDevice).toHaveBeenCalled());
  });

  it('signs out to use a different email', async () => {
    mockListSnapshots.mockRejectedValue(new Error('offline'));
    await render(<LinkDevice />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Use a different email' }));
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
