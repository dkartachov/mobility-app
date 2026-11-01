import { act, render, screen } from '@testing-library/react-native';

import { WelcomeOverlay } from './welcome-overlay';

const mockProfile = {
  value: { firstName: 'Ada', lastName: 'Lovelace', dateOfBirth: null, sex: null, photoFile: null as string | null },
};
const mockClearGreeting = jest.fn();
const mockSyncDisplayName = jest.fn();
const mockPhotoExists = { value: false };

jest.mock('@/components/avatar', () => {
  const { Text } = jest.requireActual('react-native');
  return { Avatar: ({ photoFile }: { photoFile: string }) => <Text>Photo: {photoFile}</Text> };
});
jest.mock('@/db/profile', () => ({ useProfile: () => mockProfile.value }));
jest.mock('@/lib/auth', () => ({ syncDisplayName: (...args: unknown[]) => mockSyncDisplayName(...args) }));
jest.mock('@/lib/greeting', () => ({ clearGreeting: () => mockClearGreeting() }));
jest.mock('@/lib/profile-photo', () => ({
  profilePhotoUri: (file: string | null) => (file && mockPhotoExists.value ? `file:///${file}` : null),
}));

describe('WelcomeOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockProfile.value = { ...mockProfile.value, firstName: 'Ada', photoFile: null };
    mockPhotoExists.value = false;
    mockClearGreeting.mockClear();
    mockSyncDisplayName.mockClear();
  });

  afterEach(() => jest.useRealTimers());

  it('welcomes a new user by first name only, then clears itself after the hold', async () => {
    await render(<WelcomeOverlay greeting="new" />);
    expect(screen.getByText('Welcome, Ada')).toBeTruthy();
    expect(mockSyncDisplayName).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTime(2599));
    expect(mockClearGreeting).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1));
    expect(mockClearGreeting).toHaveBeenCalledTimes(1);
  });

  it('welcomes a returning user back and fills in their display name', async () => {
    await render(<WelcomeOverlay greeting="returning" />);
    expect(screen.getByText('Welcome back, Ada')).toBeTruthy();
    expect(mockSyncDisplayName).toHaveBeenCalledWith({ firstName: 'Ada', lastName: 'Lovelace' });
  });

  it('shows a returning user their photo', async () => {
    mockProfile.value = { ...mockProfile.value, photoFile: 'me.jpg' };
    mockPhotoExists.value = true;
    await render(<WelcomeOverlay greeting="returning" />);
    expect(screen.getByText('Photo: me.jpg')).toBeTruthy();
  });

  it('shows no placeholder when the photo is missing', async () => {
    mockProfile.value = { ...mockProfile.value, photoFile: 'me.jpg' };
    await render(<WelcomeOverlay greeting="returning" />);
    expect(screen.queryByText(/Photo/)).toBeNull();
  });

  it('greets without a name when the restored profile has none', async () => {
    mockProfile.value = { ...mockProfile.value, firstName: '' };
    await render(<WelcomeOverlay greeting="returning" />);
    expect(screen.getByText('Welcome back')).toBeTruthy();
  });
});
