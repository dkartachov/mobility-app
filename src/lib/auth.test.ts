const mockUnlinkDevice = jest.fn();
let mockEmit: (event: string, session: object | null) => void = () => {};

jest.mock('@/lib/backup', () => ({ unlinkDevice: () => mockUnlinkDevice() }));
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: typeof mockEmit) => {
        mockEmit = callback;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  },
}));

// Loaded once the mock above can record its callback: importing it subscribes straight away.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- a synchronous load after setup.
const { getAuthState } = require('./auth') as typeof import('./auth');

describe('auth state', () => {
  beforeEach(() => mockUnlinkDevice.mockClear());

  it('is unknown until Supabase reads the saved session', () => {
    expect(getAuthState().signedIn).toBeUndefined();
  });

  it('follows the session', () => {
    mockEmit('INITIAL_SESSION', { user: { email: 'me@example.com' } });
    expect(getAuthState()).toEqual({ signedIn: true, email: 'me@example.com' });
    expect(mockUnlinkDevice).not.toHaveBeenCalled();
  });

  it('unlinks the phone when the session ends, so the next sign-in asks again', () => {
    mockEmit('SIGNED_OUT', null);
    expect(getAuthState()).toEqual({ signedIn: false, email: null });
    expect(mockUnlinkDevice).toHaveBeenCalled();
  });
});
