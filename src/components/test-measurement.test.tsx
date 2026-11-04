import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { FLEXIBILITY_TESTS } from '@/data/mobility-tests';

import { DialogHost } from './dialog';
import { TestMeasurement } from './test-measurement';

// The phone's sensors are faked: each test hands readings to the measurement's `onResult` itself.
let onResult: (angle: number) => void;
jest.mock('@/hooks/use-phone-measurement', () => ({
  usePhoneMeasurement: (_method: unknown, callbacks: { onResult: (angle: number) => void }) => {
    onResult = callbacks.onResult;
    return { phase: 'idle', angle: null, holdProgress: 0, start: jest.fn(), cancel: jest.fn() };
  },
}));
jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(),
  useAudioPlayer: () => ({ seekTo: () => Promise.resolve(), play: jest.fn() }),
}));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

// Measurement error of 6.3°, so readings up to 17.5° apart are averaged.
const SHOULDER_ABDUCTION = FLEXIBILITY_TESTS.find((t) => t.id === 'shoulder-abduction')!;

async function measure(...readings: number[]) {
  const onChange = jest.fn();
  await render(<TestMeasurement test={SHOULDER_ABDUCTION} value={null} onChange={onChange} />);
  for (const reading of readings) await act(() => onResult(reading));
  return onChange;
}

describe('TestMeasurement', () => {
  it('saves the average once both readings are in', async () => {
    const onChange = await measure(150);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Take reading 2')).toBeTruthy();

    await act(() => onResult(160));
    expect(onChange).toHaveBeenCalledWith(155);
  });

  it('asks to measure again when the readings are too far apart', async () => {
    const onChange = await measure(150, 170);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('150° · 170°')).toBeTruthy();
    expect(screen.getByText('Measure again')).toBeTruthy();
  });

  it('can keep the average of readings that are far apart', async () => {
    const onChange = await measure(150, 170);

    await fireEvent.press(screen.getByText('Use average'));
    expect(onChange).toHaveBeenCalledWith(160);
    expect(screen.queryByText('150° · 170°')).toBeNull();
    expect(screen.queryByText('Use average')).toBeNull();
  });

  it('explains how phone measuring works from the info button', async () => {
    await render(
      <>
        <TestMeasurement test={SHOULDER_ABDUCTION} value={null} onChange={jest.fn()} />
        <DialogHost />
      </>
    );

    await fireEvent.press(screen.getByRole('button', { name: 'How measuring with the phone works' }));
    expect(screen.getByText('Measuring with the phone')).toBeTruthy();
    expect(screen.getByText(/arm hanging straight by your side\. Hold still until a tone plays/)).toBeTruthy();
  });

  it('starts a new pair after a disagreeing one', async () => {
    const onChange = await measure(150, 170, 165, 168);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(166.5);
  });
});
