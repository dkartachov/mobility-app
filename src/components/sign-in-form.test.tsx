import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SignInForm } from './sign-in-form';

const mockSignInWithOtp = jest.fn();
const mockVerifyOtp = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    },
  },
}));

async function sendCodeTo(email: string) {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
}

describe('SignInForm', () => {
  beforeEach(() => {
    mockSignInWithOtp.mockReset().mockResolvedValue({ error: null });
    mockVerifyOtp.mockReset().mockResolvedValue({ error: null });
  });

  it('emails a code, then signs in with it', async () => {
    await render(<SignInForm />);
    await sendCodeTo(' friend@example.com ');
    await waitFor(() => expect(screen.getByText('Enter the code we sent to friend@example.com.')).toBeTruthy());
    expect(mockSignInWithOtp).toHaveBeenCalledWith({ email: 'friend@example.com' });

    await fireEvent.changeText(screen.getByLabelText('Code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(mockVerifyOtp).toHaveBeenCalledWith({ email: 'friend@example.com', token: '123456', type: 'email' })
    );
  });

  it('stays on the email step when sending the code fails', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'Email rate limit exceeded' } });
    await render(<SignInForm />);
    await sendCodeTo('friend@example.com');
    await waitFor(() => expect(screen.getByText('Email rate limit exceeded')).toBeTruthy());
    expect(screen.queryByText('Confirm')).toBeNull();
  });

  it('shows why a code was rejected', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: 'Token has expired or is invalid' } });
    await render(<SignInForm />);
    await sendCodeTo('friend@example.com');
    await fireEvent.changeText(await screen.findByLabelText('Code'), '000000');
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.getByText('Token has expired or is invalid')).toBeTruthy());
  });

  it('goes back to change the email', async () => {
    await render(<SignInForm />);
    await sendCodeTo('typo@example.com');
    await fireEvent.press(await screen.findByRole('button', { name: 'Use a different email' }));
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });
});
