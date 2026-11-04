import { act, fireEvent, screen } from '@testing-library/react-native';
import { Stack, router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import MobilityTestScreen from '@/app/mobility-test';
import { DialogHost } from '@/components/dialog';
import { setSkipTestMeasurements } from '@/lib/dev-settings';

type MockPlayerProps = { steps: unknown[]; onComplete: () => void; onBack: () => void };

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }));
jest.mock('@/db/mobility-tests', () => ({ logMobilityTest: jest.fn(), useMobilityScore: () => null }));
// The real player runs timers, cues and animations; here it only needs to finish or go back.
jest.mock('@/components/workout-player', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    WorkoutPlayer: ({ steps, onComplete, onBack }: MockPlayerProps) => (
      <>
        <Text>Warm-up player: {steps.length} steps</Text>
        <Pressable accessibilityRole="button" onPress={onComplete}>
          <Text>Finish warm-up</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onBack}>
          <Text>Warm-up back</Text>
        </Pressable>
      </>
    ),
  };
});
jest.mock('@/components/test-measurement', () => ({ TestMeasurement: () => null }));

const routes = {
  _layout: () => (
    <>
      <Stack />
      <DialogHost />
    </>
  ),
  index: () => <Text>Home</Text>,
  'mobility-test': MobilityTestScreen,
};

const button = (name: string) => screen.getByRole('button', { name });

/** Pushed on top of another screen, as in the app, so there's somewhere to go back to. */
async function openTest() {
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByText('Home');
  await act(() => router.push('/mobility-test'));
  await screen.findByText('Flexibility test');
}

describe('flexibility test warm-up', () => {
  beforeEach(() => setSkipTestMeasurements(false));

  it('starts with the warm-up, then offers the test', async () => {
    await openTest();

    await fireEvent.press(button('Start warm-up'));
    expect(screen.getByText(/Warm-up player/)).toBeTruthy();

    await fireEvent.press(button('Finish warm-up'));
    expect(screen.getByText('Warm-up done')).toBeTruthy();

    await fireEvent.press(button('Start test'));
    expect(screen.getByText('Knee to wall')).toBeTruthy();
  });

  it('asks before leaving when the test is declined after the warm-up', async () => {
    await openTest();
    await fireEvent.press(button('Start warm-up'));
    await fireEvent.press(button('Finish warm-up'));

    await fireEvent.press(button('Not now'));
    expect(screen.getByText('Skip the test?')).toBeTruthy();

    await fireEvent.press(button('Skip test'));
    expect(await screen.findByText('Home')).toBeTruthy();
    expect(screen.queryByText('Warm-up done')).toBeNull();
  });

  it('stays after the warm-up when skipping the test is cancelled', async () => {
    await openTest();
    await fireEvent.press(button('Start warm-up'));
    await fireEvent.press(button('Finish warm-up'));

    await fireEvent.press(button('Not now'));
    await fireEvent.press(button('Stay'));

    expect(screen.getByText('Warm-up done')).toBeTruthy();
  });

  it('asks the same before going back or swiping back after the warm-up', async () => {
    await openTest();
    await fireEvent.press(button('Start warm-up'));
    await fireEvent.press(button('Finish warm-up'));

    await act(() => router.back());

    expect(screen.getByText('Skip the test?')).toBeTruthy();
    expect(screen.getByText('Warm-up done')).toBeTruthy();
  });

  it('asks before stopping the warm-up, then goes back to the intro', async () => {
    await openTest();
    await fireEvent.press(button('Start warm-up'));

    await fireEvent.press(button('Warm-up back'));
    expect(screen.getByText('Stop the warm-up?')).toBeTruthy();

    await fireEvent.press(button('Stop warm-up'));
    expect(screen.queryByText(/Warm-up player/)).toBeNull();
    expect(button('Start warm-up')).toBeTruthy();
  });

  it('only offers skipping the warm-up with the dev switch on', async () => {
    await openTest();
    expect(screen.queryByRole('button', { name: 'Skip warm-up' })).toBeNull();
  });

  it('skips straight to the ready screen with the dev switch on', async () => {
    setSkipTestMeasurements(true);
    await openTest();

    await fireEvent.press(button('Skip warm-up'));

    expect(screen.getByText('Warm-up done')).toBeTruthy();
  });
});
