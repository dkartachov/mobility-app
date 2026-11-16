import { render, screen } from '@testing-library/react-native';

import { CAT_COW, FINGER_TENDON_GLIDES } from '@/data/exercise-animations';
import { CAT_COW_3D, HIP_INTERNAL_ROTATION_3D, STRAIGHT_LEG_RAISE_3D } from '@/data/exercise-animations-3d';

import { ExerciseVideo } from './exercise-video';

describe('ExerciseVideo', () => {
  it('shows the animation when the exercise has one', async () => {
    await render(<ExerciseVideo photo={{ uri: 'photo.png' }} animation={CAT_COW} />);
    expect(screen.getByLabelText('Animated demonstration')).toBeTruthy();
  });

  it('shows an animation for the 3D engine the same way', async () => {
    await render(<ExerciseVideo photo={{ uri: 'photo.png' }} animation={CAT_COW_3D} />);
    expect(screen.getByLabelText('Animated demonstration')).toBeTruthy();
  });

  it('says when a test needs a partner, and not otherwise', async () => {
    await render(<ExerciseVideo animation={HIP_INTERNAL_ROTATION_3D} />);
    expect(screen.getByLabelText('Animated demonstration, done with a partner')).toBeTruthy();
    expect(screen.getByText('With a partner')).toBeTruthy();
    await render(<ExerciseVideo animation={STRAIGHT_LEG_RAISE_3D} />);
    expect(screen.queryByText('With a partner')).toBeNull();
  });

  it('shows a hand animation the same way', async () => {
    await render(<ExerciseVideo photo={{ uri: 'photo.png' }} animation={FINGER_TENDON_GLIDES} />);
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
