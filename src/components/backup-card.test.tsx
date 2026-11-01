import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { formatDateKey } from '@/lib/dates';

import { BackupCard } from './backup-card';

const mockDb = {};
const mockListSnapshots = jest.fn();
const mockRestoreSnapshot = jest.fn();
const mockShowDialog = jest.fn();
const mockState = { linked: true, lastBackupAt: null as string | null, lastError: null as string | null, running: false };

jest.mock('expo', () => ({ ...jest.requireActual('expo'), reloadAppAsync: jest.fn() }));
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
jest.mock('@/components/dialog', () => ({ showDialog: (...args: unknown[]) => mockShowDialog(...args) }));
jest.mock('@/lib/auth', () => ({ useAuthState: () => ({ signedIn: true, email: 'me@example.com' }) }));
jest.mock('@/lib/backup', () => ({
  isBackupConfigured: true,
  backUp: jest.fn(),
  listSnapshots: () => mockListSnapshots(),
  restoreSnapshot: (...args: unknown[]) => mockRestoreSnapshot(...args),
  useBackupState: () => mockState,
}));

describe('BackupCard', () => {
  beforeEach(() => {
    mockShowDialog.mockClear();
    mockRestoreSnapshot.mockReset();
    mockListSnapshots.mockReset();
    mockState.lastBackupAt = null;
    mockState.lastError = null;
  });

  it('shows the account and that nothing is backed up yet', async () => {
    await render(<BackupCard />);
    expect(screen.getByText('No backups yet. Backing up to me@example.com.')).toBeTruthy();
  });

  it("can't be turned off", async () => {
    await render(<BackupCard />);
    expect(screen.queryByText(/sign out|turn off/i)).toBeNull();
  });

  it('shows why the last backup failed', async () => {
    mockState.lastError = 'project paused';
    await render(<BackupCard />);
    expect(screen.getByText('Last backup failed: project paused')).toBeTruthy();
  });

  it('restores the latest backup after confirming', async () => {
    mockListSnapshots.mockResolvedValue(['2026-01-02', '2026-01-01']);
    await render(<BackupCard />);
    await fireEvent.press(screen.getByRole('button', { name: 'Restore backup' }));
    await waitFor(() => expect(mockShowDialog).toHaveBeenCalledTimes(1));

    const [{ title, confirm }] = mockShowDialog.mock.calls[0];
    expect(title).toContain(formatDateKey('2026-01-02'));
    await confirm.onPress();
    expect(mockRestoreSnapshot).toHaveBeenCalledWith(mockDb, '2026-01-02');
  });

  it('says so when there is no backup to restore', async () => {
    mockListSnapshots.mockResolvedValue([]);
    await render(<BackupCard />);
    await fireEvent.press(screen.getByRole('button', { name: 'Restore backup' }));
    await waitFor(() =>
      expect(mockShowDialog).toHaveBeenCalledWith(expect.objectContaining({ title: 'No backup yet' }))
    );
    expect(mockRestoreSnapshot).not.toHaveBeenCalled();
  });
});
