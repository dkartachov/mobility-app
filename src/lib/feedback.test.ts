import { sendFeedback } from '@/lib/feedback';

const mockInvoke = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));
jest.mock('@/lib/auth', () => ({ useAuthState: () => ({ signedIn: true, email: null }) }));
jest.mock('expo-application', () => ({
  applicationId: 'com.hogos.plie.dev',
  nativeApplicationVersion: '1.2.0',
  nativeBuildVersion: '42',
}));

beforeEach(() => {
  mockInvoke.mockReset().mockResolvedValue({ data: { sent: true }, error: null });
});

describe('sendFeedback', () => {
  it('sends an exercise report to the Edge Function with the app details', async () => {
    await sendFeedback({
      kind: 'exercise',
      exerciseId: 'butterfly',
      exerciseName: 'Butterfly',
      reason: 'unclear',
      message: '  Which way do my knees go?  ',
    });

    expect(mockInvoke).toHaveBeenCalledWith('send-feedback', {
      body: expect.objectContaining({
        kind: 'exercise',
        exerciseId: 'butterfly',
        exerciseName: 'Butterfly',
        reason: 'unclear',
        message: 'Which way do my knees go?',
        appVersion: '1.2.0 (42)',
        variant: 'com.hogos.plie.dev',
      }),
    });
  });

  it('cuts off messages longer than the function keeps', async () => {
    await sendFeedback({ kind: 'general', message: 'a'.repeat(5000) });

    expect(mockInvoke.mock.calls[0][1].body.message).toHaveLength(2000);
  });

  it('throws a message to show when sending fails', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: { message: 'Failed to send a request' } });

    await expect(sendFeedback({ kind: 'general', message: 'Hi' })).rejects.toThrow(/Check your connection/);
  });
});
