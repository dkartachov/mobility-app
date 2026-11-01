import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { formatDateKey } from '@/lib/dates';

import { BackupCard } from './backup-card';

const mockDb = {};
const mockSession = { value: {} as object | null };
const mockLinkDevice = jest.fn();
const mockListSnapshots = jest.fn();
const mockRestoreSnapshot = jest.fn();
const mockShowDialog = jest.fn();
const mockSignInWithOtp = jest.fn();
const mockVerifyOtp = jest.fn();
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
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
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
    mockSignInWithOtp.mockReset().mockResolvedValue({ error: null });
    mockVerifyOtp.mockReset().mockResolvedValue({ error: null });
  });

  it('asks for an email when signed out', async () => {
    mockSession.value = null;
    await render(<BackupCard />);
    expect(screen.getByText('Turn on backups')).toBeTruthy();
    expect(mockListSnapshots).not.toHaveBeenCalled();
  });

  it('emails a code, then signs in with it', async () => {
    mockSession.value = null;
    await render(<BackupCard />);
    await fireEvent.changeText(screen.getByLabelText('Email'), ' friend@example.com ');
    await fireEvent.press(screen.getByRole('button', { name: 'Turn on backups' }));
    await waitFor(() => expect(screen.getByText('Enter the code we sent to friend@example.com.')).toBeTruthy());
    expect(mockSignInWithOtp).toHaveBeenCalledWith({ email: 'friend@example.com' });

    await fireEvent.changeText(screen.getByLabelText('Code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(mockVerifyOtp).toHaveBeenCalledWith({ email: 'friend@example.com', token: '123456', type: 'email' })
    );
  });

  it('stays on the email step when sending the code fails', async () => {
    mockSession.value = null;
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Email rate limit exceeded' } });
    await render(<BackupCard />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'friend@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Turn on backups' }));
    await waitFor(() => expect(screen.getByText('Email rate limit exceeded')).toBeTruthy());
    expect(screen.queryByText('Confirm')).toBeNull();
  });

  it('shows why a code was rejected', async () => {
    mockSession.value = null;
    mockVerifyOtp.mockResolvedValue({ error: { message: 'Token has expired or is invalid' } });
    await render(<BackupCard />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'friend@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Turn on backups' }));
    await fireEvent.changeText(await screen.findByLabelText('Code'), '000000');
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.getByText('Token has expired or is invalid')).toBeTruthy());
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

  it('asks whether to restore the latest backup or keep the phone\'s data', async () => {
    mockListSnapshots.mockResolvedValue(['2026-01-02', '2026-01-01']);
    await render(<BackupCard />);
    await waitFor(() => expect(mockShowDialog).toHaveBeenCalledTimes(1));

    const [{ title, message, actions }] = mockShowDialog.mock.calls[0];
    expect(title).toBe('Restore your backup?');
    expect(message).toContain(formatDateKey('2026-01-02'));
    expect(message).toContain('replaces the backup in the cloud');
    expect(actions.map((action: { label: string }) => action.label)).toEqual(['Restore', "Keep this phone's data"]);

    await actions[0].onPress();
    expect(mockRestoreSnapshot).toHaveBeenCalledWith(mockDb, '2026-01-02');
  });

  it("starts backing up when keeping the phone's data", async () => {
    mockListSnapshots.mockResolvedValue(['2026-01-02']);
    await render(<BackupCard />);
    await waitFor(() => expect(mockShowDialog).toHaveBeenCalledTimes(1));

    await mockShowDialog.mock.calls[0][0].actions[1].onPress();
    expect(mockLinkDevice).toHaveBeenCalledWith(mockDb);
    expect(mockRestoreSnapshot).not.toHaveBeenCalled();
  });

  it('stays paused with both choices on the card when the dialog is dismissed', async () => {
    mockListSnapshots.mockResolvedValue(['2026-01-02']);
    await render(<BackupCard />);
    await waitFor(() => expect(mockShowDialog).toHaveBeenCalledTimes(1));

    expect(mockRestoreSnapshot).not.toHaveBeenCalled();
    expect(mockLinkDevice).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Restore backup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: "Keep this phone's data" })).toBeTruthy();
  });

  it('restores the latest backup on a linked device after confirming', async () => {
    mockState.linked = true;
    mockListSnapshots.mockResolvedValue(['2026-01-02', '2026-01-01']);
    await render(<BackupCard />);
    await fireEvent.press(screen.getByRole('button', { name: 'Restore backup' }));
    await waitFor(() => expect(mockShowDialog).toHaveBeenCalledTimes(1));

    const [{ title, confirm }] = mockShowDialog.mock.calls[0];
    expect(title).toContain(formatDateKey('2026-01-02'));
    await confirm.onPress();
    expect(mockRestoreSnapshot).toHaveBeenCalledWith(mockDb, '2026-01-02');
  });

  it('says so when a linked device has no backup to restore', async () => {
    mockState.linked = true;
    mockListSnapshots.mockResolvedValue([]);
    await render(<BackupCard />);
    await fireEvent.press(screen.getByRole('button', { name: 'Restore backup' }));
    await waitFor(() => expect(mockShowDialog).toHaveBeenCalledWith(expect.objectContaining({ title: 'No backup yet' })));
    expect(mockRestoreSnapshot).not.toHaveBeenCalled();
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
