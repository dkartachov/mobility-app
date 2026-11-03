import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { MilestoneReveal } from './milestone-reveal';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('MilestoneReveal', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('offers Done only once the badge has landed', async () => {
    const onDone = jest.fn();
    await render(<MilestoneReveal hours={10} onDone={onDone} />);
    expect(screen.getByText('Milestone reached!')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.queryByText('Done')).toBeNull();

    await act(async () => jest.advanceTimersByTime(4000));
    expect(screen.getByText('10 hours of mobility time')).toBeTruthy();

    await fireEvent.press(screen.getByText('Done'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('uses the singular for the first milestone', async () => {
    await render(<MilestoneReveal hours={1} onDone={jest.fn()} />);
    await act(async () => jest.advanceTimersByTime(4000));
    expect(screen.getByText('1 hour of mobility time')).toBeTruthy();
  });
});
