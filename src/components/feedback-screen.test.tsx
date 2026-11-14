import { act, fireEvent, screen } from '@testing-library/react-native';
import { Stack, router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import FeedbackScreen from '@/app/feedback';

const mockSend = jest.fn();

jest.mock('@/lib/feedback', () => ({
  ...jest.requireActual('@/lib/feedback'),
  sendFeedback: (...args: unknown[]) => mockSend(...args),
}));
// The real module creates a Supabase client, which these tests never reach.
jest.mock('@/lib/supabase', () => ({ supabase: null }));

const routes = {
  _layout: () => <Stack />,
  index: () => <Text>Home</Text>,
  feedback: FeedbackScreen,
};

async function open(params: { exerciseId?: string } = {}) {
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByText('Home');
  await act(() => router.push({ pathname: '/feedback', params }));
}

function sendButton() {
  return screen.getByRole('button', { name: 'Send' });
}

beforeEach(() => {
  mockSend.mockReset().mockResolvedValue(undefined);
});

describe('feedback screen', () => {
  it('reports a problem with an exercise once a reason is picked', async () => {
    await open({ exerciseId: 'butterfly' });

    expect(await screen.findByRole('header', { name: 'Butterfly' })).toBeTruthy();
    expect(sendButton()).toBeDisabled();

    await fireEvent.press(screen.getByRole('radio', { name: 'Instructions unclear' }));
    await fireEvent.changeText(screen.getByPlaceholderText(/which side or step/), 'Knees up or down?');
    await fireEvent.press(sendButton());

    expect(mockSend).toHaveBeenCalledWith({
      kind: 'exercise',
      exerciseId: 'butterfly',
      exerciseName: 'Butterfly',
      reason: 'unclear',
      message: 'Knees up or down?',
    });
    expect(await screen.findByText('Thanks!')).toBeTruthy();
  });

  it('tells you to stop when an exercise hurts', async () => {
    await open({ exerciseId: 'butterfly' });

    expect(screen.queryByText(/Stop any exercise that hurts/)).toBeNull();
    await fireEvent.press(await screen.findByRole('radio', { name: 'Caused pain' }));
    expect(screen.getByText(/Stop any exercise that hurts/)).toBeTruthy();
  });

  it('sends general feedback once there is a message', async () => {
    await open();

    expect(await screen.findByRole('header', { name: 'Send feedback' })).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(sendButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByPlaceholderText(/What would you like/), 'Love it');
    await fireEvent.press(sendButton());

    expect(mockSend).toHaveBeenCalledWith({ kind: 'general', message: 'Love it' });
    expect(await screen.findByText('Thanks!')).toBeTruthy();
  });

  it('keeps the message and shows why when sending fails', async () => {
    mockSend.mockRejectedValueOnce(new Error("Couldn't send your feedback."));
    await open();

    await fireEvent.changeText(await screen.findByPlaceholderText(/What would you like/), 'Love it');
    await fireEvent.press(sendButton());

    expect(await screen.findByText("Couldn't send your feedback.")).toBeTruthy();
    expect(screen.getByDisplayValue('Love it')).toBeTruthy();
    expect(screen.queryByText('Thanks!')).toBeNull();
  });
});
