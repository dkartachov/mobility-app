import { render, screen } from '@testing-library/react-native';

import { ProgressBar } from './progress-bar';

describe('ProgressBar', () => {
  it.each([
    [0.426, 43],
    [-0.5, 0],
    [1.7, 100],
  ])('reports progress %d as %i%%, clamped to 0–100', async (progress, percent) => {
    await render(<ProgressBar progress={progress} />);

    // The track isn't marked `accessible`, so it can't be found by role.
    expect(screen.root).toHaveAccessibilityValue({ min: 0, max: 100, now: percent });
  });
});
