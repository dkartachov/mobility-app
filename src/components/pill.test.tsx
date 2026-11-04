import { fireEvent, render, screen } from '@testing-library/react-native';

import { DialogHost } from './dialog';
import { ScoreChangePill } from './pill';

describe('ScoreChangePill', () => {
  it('explains a change within measurement error when pressed', async () => {
    await render(
      <>
        <ScoreChangePill change={{ points: 3, real: false, noise: 8.3 }} suffix=" since last test" explainable />
        <DialogHost />
      </>
    );

    await fireEvent.press(screen.getByRole('button', { name: 'No real change since last test' }));

    expect(screen.getByText('Why no real change?')).toBeTruthy();
    expect(screen.getByText(/up to 8 points/)).toBeTruthy();
  });

  it('is only a label for a real change, or when not explainable', async () => {
    await render(
      <>
        <ScoreChangePill change={{ points: 12, real: true, noise: 8 }} explainable />
        <ScoreChangePill change={{ points: 3, real: false, noise: 8 }} />
      </>
    );

    expect(screen.getByText('+12 pts')).toBeTruthy();
    expect(screen.getByText('No real change')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
