import { act, fireEvent, screen } from '@testing-library/react-native';
import { Stack, router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Dimensions, Text } from 'react-native';

import ExerciseScreen from '@/app/exercise/[id]';
import { EXERCISES } from '@/data/exercises';

// The figure runs its own animation loop; here it only needs to say whether it's playing.
jest.mock('@/components/exercise-video', () => {
  const { Text } = jest.requireActual('react-native');
  return { ExerciseVideo: ({ playing }: { playing: boolean }) => <Text>{playing ? 'Playing' : 'Waiting'}</Text> };
});

const routes = {
  _layout: () => <Stack />,
  index: () => <Text>Home</Text>,
  'exercise/[id]': ExerciseScreen,
};

async function open(params: { id: string; list?: string }) {
  await renderRouter(routes, { initialUrl: '/' });
  await screen.findByText('Home');
  await act(() => router.push({ pathname: '/exercise/[id]', params }));
}

describe('exercise screen', () => {
  it('opens on the tapped exercise, placed in the list it came from', async () => {
    await open({ id: 'butterfly', list: 'pancake,butterfly,happy-baby' });

    expect(await screen.findByText(/2 of 3/)).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Butterfly' })).toBeTruthy();
  });

  it('plays only the exercise on screen, switching over on a swipe', async () => {
    await open({ id: 'butterfly', list: 'pancake,butterfly,happy-baby' });
    expect(await screen.findAllByText('Playing')).toHaveLength(1);
    expect(screen.getByRole('header', { name: 'Butterfly' })).toBeTruthy();

    const pages = screen.getByLabelText('Exercises, swipe to change');
    const { width } = Dimensions.get('window');
    await act(() => fireEvent(pages, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: width * 2, y: 0 } } }));

    // Without layout, the test renderer only ever draws the first page, so this checks it stopped.
    expect(await screen.findByText('Waiting')).toBeTruthy();
    expect(screen.queryByText('Playing')).toBeNull();
  });

  it('swipes through the whole library without a list', async () => {
    const index = EXERCISES.findIndex((exercise) => exercise.id === 'butterfly');
    await open({ id: 'butterfly' });

    expect(await screen.findByText(new RegExp(`${index + 1} of ${EXERCISES.length}`))).toBeTruthy();
  });

  it('shows only the exercise when it is missing from the list', async () => {
    await open({ id: 'butterfly', list: 'pancake' });

    expect(await screen.findByRole('header', { name: 'Butterfly' })).toBeTruthy();
    expect(screen.queryByText(/\d+ of \d+/)).toBeNull();
  });
});
