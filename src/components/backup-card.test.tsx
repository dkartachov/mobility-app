import { render, screen, waitFor } from '@testing-library/react-native';

import { formatDateKey } from '@/lib/dates';

import { BackupCard } from './backup-card';

const mockDb = {};
const mockSession = { value: {} as object | null };
const mockLinkDevice = jest.fn();
const mockListSnapshots = jest.fn();
const mockRestoreSnapshot = jest.fn();
const mockShowDialog = jest.fn();
const mockState = { linked: false, lastBackupAt: null as string | null, lastError: null as string | null, running: false };

jest.mock('expo', () => ({ ...jest.requireActual('expo'), reloadAppAsync: jest.fn() }));
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
jest.mock('@/components/dialog', () => ({ showDialog: (...args: unknown[]) => mockShowDialog(...args) }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: (event: string, session: object | null) => void) => {
        callback('INITIAL_SESSION', mockSession.value);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  },
}));

jest.mock('@/lib/backup', () => ({
  isBackupConfigured: true,
  backUp: jest.fn(),
  linkDevice: (...args: unknown[]) => mockLinkDevice(...args),
  listSnapshots: () => mockListSnapshots(),
  restoreSnapshot: (...args: unknown[]) => mockRestoreSnapshot(...args),
  unlinkDevice: jest.fn(),
  useBackupState: () => mockState,
}));

describe('BackupCard', () => {
  beforeEach(() => {
    mockShowDialog.mockClear();
    mockRestoreSnapshot.mockReset();
    mockSession.value = {};
    mockState.linked = false;
    mockState.lastBackupAt = null;
    mockState.lastError = null;
    mockLinkDevice.mockClear();
    mockListSnapshots.mockReset();
  });

  it('offers to turn on backups when signed out', async () => {
    mockSession.value = null;
    await render(<BackupCard />);
    expect(screen.getByText('Turn on backups')).toBeTruthy();
    expect(mockListSnapshots).not.toHaveBeenCalled();
  });

  it('starts backing up straight away when the account has no backups', async () => {
    mockListSnapshots.mockResolvedValue([]);
    await render(<BackupCard />);
    await waitFor(() => expect(mockLinkDevice).toHaveBeenCalledWith(mockDb));
  });

  it("asks before backing up over an account's existing backups", async () => {
    mockListSnapshots.mockResolvedValue(['2026-01-02', '2026-01-01']);
    await render(<BackupCard />);
    await waitFor(() => expect(screen.getByText("Keep this phone's data")).toBeTruthy());
    expect(mockLinkDevice).not.toHaveBeenCalled();
  });

  it('offers to restore the latest backup after signing in', async () => {
    mockListSnapshots.mockResolvedValue(['2026-01-02', '2026-01-01']);
    await render(<BackupCard />);
    await waitFor(() => expect(mockShowDialog).toHaveBeenCalledTimes(1));

    const [{ title, message, confirm }] = mockShowDialog.mock.calls[0];
    expect(title).toBe('Restore your latest backup?');
    expect(message).toContain(formatDateKey('2026-01-02'));

    expect(confirm.label).toBe('Restore');
    await confirm.onPress();
    expect(mockRestoreSnapshot).toHaveBeenCalledWith(mockDb, '2026-01-02');
  });

  it("doesn't restore or start backing up when the offer is declined", async () => {
    mockListSnapshots.mockResolvedValue(['2026-01-02']);
    await render(<BackupCard />);
    await waitFor(() => expect(mockShowDialog).toHaveBeenCalledTimes(1));

    expect(mockShowDialog.mock.calls[0][0].cancelLabel).toBe('Not now');
    expect(mockRestoreSnapshot).not.toHaveBeenCalled();
    expect(mockLinkDevice).not.toHaveBeenCalled();
    expect(screen.getByText("Keep this phone's data")).toBeTruthy();
  });

  it("doesn't offer a restore on a device that's already linked", async () => {
    mockState.linked = true;
    await render(<BackupCard />);
    expect(mockShowDialog).not.toHaveBeenCalled();
  });

  it("doesn't offer a restore when the account has no backups", async () => {
    mockListSnapshots.mockResolvedValue([]);
    await render(<BackupCard />);
    await waitFor(() => expect(mockLinkDevice).toHaveBeenCalled());
    expect(mockShowDialog).not.toHaveBeenCalled();
  });

  it("stays paused when it can't check for backups", async () => {
    mockListSnapshots.mockRejectedValue(new Error('offline'));
    await render(<BackupCard />);
    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy());
    expect(mockLinkDevice).not.toHaveBeenCalled();
  });

  it('shows why the last backup failed', async () => {
    mockState.linked = true;
    mockState.lastError = 'project paused';
    await render(<BackupCard />);
    expect(screen.getByText('Last backup failed: project paused')).toBeTruthy();
    expect(mockListSnapshots).not.toHaveBeenCalled();
  });
});
