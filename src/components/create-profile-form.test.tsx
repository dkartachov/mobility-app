import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { CreateProfileForm } from './create-profile-form';

const mockDb = {};
const mockUpdateProfile = jest.fn();
const mockLinkDevice = jest.fn();
const mockSetGreeting = jest.fn();
const mockSyncDisplayName = jest.fn();
const mockSignOut = jest.fn();

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
jest.mock('@/db/profile', () => ({
  ...jest.requireActual('@/db/profile'),
  getProfile: async () => ({ firstName: '', lastName: '', dateOfBirth: null, sex: null, photoFile: 'kept.jpg' }),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));
jest.mock('@/lib/auth', () => ({ syncDisplayName: (...args: unknown[]) => mockSyncDisplayName(...args) }));
jest.mock('@/lib/backup', () => ({ linkDevice: (...args: unknown[]) => mockLinkDevice(...args) }));
jest.mock('@/lib/greeting', () => ({ setGreeting: (...args: unknown[]) => mockSetGreeting(...args) }));
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: (...args: unknown[]) => mockSignOut(...args) } } }));
// The date picker is native, so tests get a button that picks a date.
jest.mock('@/components/date-field', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    DateField: ({ onChange }: { onChange: (value: string) => void }) => (
      <Pressable accessibilityRole="button" onPress={() => onChange('1990-12-10')}>
        <Text>Pick date</Text>
      </Pressable>
    ),
  };
});

function continueButton() {
  return screen.getByRole('button', { name: 'Continue' });
}

describe('CreateProfileForm', () => {
  beforeEach(() => {
    mockUpdateProfile.mockReset().mockResolvedValue(undefined);
    mockLinkDevice.mockClear();
    mockSetGreeting.mockClear();
    mockSyncDisplayName.mockClear();
    mockSignOut.mockClear();
  });

  it('requires a first name, date of birth and sex at birth, but not a last name', async () => {
    await render(<CreateProfileForm />);
    expect(continueButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('First name'), '  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Pick date' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Female' }));
    expect(continueButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('First name'), 'Ada');
    expect(continueButton()).toBeEnabled();
  });

  it('saves the profile, then greets the user and opens the app', async () => {
    await render(<CreateProfileForm />);
    await fireEvent.changeText(screen.getByLabelText('First name'), 'Ada');
    await fireEvent.changeText(screen.getByLabelText('Last name'), 'Lovelace');
    await fireEvent.press(screen.getByRole('button', { name: 'Pick date' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Female' }));
    await fireEvent.press(continueButton());

    await waitFor(() => expect(mockLinkDevice).toHaveBeenCalledWith(mockDb));
    expect(mockUpdateProfile).toHaveBeenCalledWith(mockDb, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      dateOfBirth: '1990-12-10',
      sex: 'female',
      photoFile: 'kept.jpg',
    });
    expect(mockSyncDisplayName).toHaveBeenCalledWith({ firstName: 'Ada', lastName: 'Lovelace' });
    expect(mockSetGreeting).toHaveBeenCalledWith('new');
  });

  it("stays on the form when saving fails, so the app doesn't open without a profile", async () => {
    mockUpdateProfile.mockRejectedValue(new Error('disk full'));
    await render(<CreateProfileForm />);
    await fireEvent.changeText(screen.getByLabelText('First name'), 'Ada');
    await fireEvent.press(screen.getByRole('button', { name: 'Pick date' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Male' }));
    await fireEvent.press(continueButton());

    expect(await screen.findByText('disk full')).toBeTruthy();
    expect(mockLinkDevice).not.toHaveBeenCalled();
    expect(mockSetGreeting).not.toHaveBeenCalled();
  });

  it('signs out to use a different email', async () => {
    await render(<CreateProfileForm />);
    await fireEvent.press(screen.getByRole('button', { name: 'Use a different email' }));
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
