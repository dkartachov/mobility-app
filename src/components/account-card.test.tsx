import { fireEvent, render, screen } from '@testing-library/react-native';
import { reloadAppAsync } from 'expo';

import { AccountCard } from './account-card';

const mockDb = {};
const mockShowDialog = jest.fn();
const mockSignOutAndErase = jest.fn();

jest.mock('expo', () => ({ ...jest.requireActual('expo'), reloadAppAsync: jest.fn() }));
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
jest.mock('@/components/dialog', () => ({ showDialog: (...args: unknown[]) => mockShowDialog(...args) }));
jest.mock('@/lib/auth', () => ({ useAuthState: () => ({ signedIn: true, email: 'me@example.com' }) }));
jest.mock('@/lib/backup', () => ({ signOutAndErase: (...args: unknown[]) => mockSignOutAndErase(...args) }));

describe('AccountCard', () => {
  beforeEach(() => {
    mockShowDialog.mockClear();
    mockSignOutAndErase.mockReset().mockResolvedValue(undefined);
    jest.mocked(reloadAppAsync).mockClear();
  });

  it('shows who is signed in', async () => {
    await render(<AccountCard />);
    expect(screen.getByText('Signed in as me@example.com.')).toBeTruthy();
  });

  it('does nothing until confirmed', async () => {
    await render(<AccountCard />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(mockShowDialog.mock.calls[0][0].message).toMatch(/removed from this phone/);
    expect(mockSignOutAndErase).not.toHaveBeenCalled();
  });

  it('signs out and reloads, which erases the phone', async () => {
    await render(<AccountCard />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await mockShowDialog.mock.calls[0][0].confirm.onPress();
    expect(mockSignOutAndErase).toHaveBeenCalledWith(mockDb);
    expect(reloadAppAsync).toHaveBeenCalled();
  });

  it("says why when it can't sign out, and doesn't reload", async () => {
    mockSignOutAndErase.mockRejectedValue(new Error('project paused'));
    await render(<AccountCard />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await mockShowDialog.mock.calls[0][0].confirm.onPress();

    expect(mockShowDialog).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: "Couldn't sign out", message: expect.stringContaining('project paused') })
    );
    expect(reloadAppAsync).not.toHaveBeenCalled();
  });
});
