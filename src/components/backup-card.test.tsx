import { render, screen, waitFor } from '@testing-library/react-native';

import { BackupCard } from './backup-card';

const mockDb = {};
const mockSession = { value: {} as object | null };
const mockLinkDevice = jest.fn();
const mockListSnapshots = jest.fn();
const mockState = { linked: false, lastBackupAt: null as string | null, lastError: null as string | null, running: false };

jest.mock('expo', () => ({ ...jest.requireActual('expo'), reloadAppAsync: jest.fn() }));
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));

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
  restoreSnapshot: jest.fn(),
  unlinkDevice: jest.fn(),
  useBackupState: () => mockState,
}));

describe('BackupCard', () => {
  beforeEach(() => {
    mockSession.value = {};
    mockState.linked = false;
    mockState.lastBackupAt = null;
    mockState.lastError = null;
    mockLinkDevice.mockClear();
    mockListSnapshots.mockReset();
  });

  it('asks to sign in when signed out', async () => {
    mockSession.value = null;
    await render(<BackupCard />);
    expect(screen.getByText('Sign in')).toBeTruthy();
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
