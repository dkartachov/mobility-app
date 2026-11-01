import { render, screen } from '@testing-library/react-native';

import { CAT_COW } from '@/data/exercise-animations';

import { ExerciseVideo } from './exercise-video';

describe('ExerciseVideo', () => {
  it('shows the animation when the exercise has one', async () => {
    await render(<ExerciseVideo photo={{ uri: 'photo.png' }} animation={CAT_COW} />);
    expect(screen.getByLabelText('Animated demonstration')).toBeTruthy();
  });

  it('falls back to the photo without an animation', async () => {
    await render(<ExerciseVideo photo={{ uri: 'photo.png' }} />);
    expect(screen.queryByLabelText('Animated demonstration')).toBeNull();
    expect(screen.queryByLabelText('Exercise video, coming soon')).toBeNull();
  });

  it('shows the coming soon panel with neither', async () => {
    await render(<ExerciseVideo />);
    expect(screen.getByLabelText('Exercise video, coming soon')).toBeTruthy();
  });
});
