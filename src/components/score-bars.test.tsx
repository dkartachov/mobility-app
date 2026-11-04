import { render, screen } from '@testing-library/react-native';

import type { AreaScores, ScoreChanges } from '@/data/mobility-score';

import { ScoreBars } from './score-bars';

const SCORES: AreaScores = { shoulders: 60, hips: 50, hamstrings: 40, ankles: null };
const CHANGES: ScoreChanges['areas'] = {
  shoulders: { points: 10, real: true, noise: 5 },
  hips: { points: 2, real: false, noise: 5 },
  hamstrings: { points: -9, real: true, noise: 5 },
  ankles: null,
};

describe('ScoreBars', () => {
  it('names each area and shows its change, or that there was no real change', async () => {
    await render(<ScoreBars scores={SCORES} changes={CHANGES} />);

    expect(screen.getByText('Shoulders')).toBeTruthy();
    expect(screen.getByLabelText('+10 points since last test')).toBeTruthy();
    expect(screen.getByText('−9 pts')).toBeTruthy();
    expect(screen.getByLabelText('No real change since last test')).toBeTruthy();
    expect(screen.getByText('Same')).toBeTruthy();
  });

  it('shows no text with only the bars, keeping the areas for screen readers', async () => {
    await render(<ScoreBars scores={SCORES} changes={CHANGES} barsOnly />);

    expect(screen.queryByText('60')).toBeNull();
    expect(screen.queryByText('Shoulders')).toBeNull();
    expect(screen.queryAllByLabelText(/since last test/)).toHaveLength(0);
    expect(screen.getByLabelText('Shoulders')).toBeTruthy();
  });
});
