import { render, screen } from '@testing-library/react-native';

import type { AreaScores } from '@/data/mobility-score';

import { ScoreBars } from './score-bars';

const SCORES: AreaScores = { shoulders: 60, hips: 50, hamstrings: 40, ankles: null };
const PREVIOUS: AreaScores = { shoulders: 50, hips: 50, hamstrings: 40, ankles: null };

describe('ScoreBars', () => {
  it('names each area and shows its change', async () => {
    await render(<ScoreBars scores={SCORES} previous={PREVIOUS} />);

    expect(screen.getByText('Shoulders')).toBeTruthy();
    expect(screen.getAllByLabelText(/since last test/).length).toBeGreaterThan(0);
  });

  it('shows no text with only the bars, keeping the areas for screen readers', async () => {
    await render(<ScoreBars scores={SCORES} previous={PREVIOUS} barsOnly />);

    expect(screen.queryByText('60')).toBeNull();
    expect(screen.queryByText('Shoulders')).toBeNull();
    expect(screen.queryAllByLabelText(/since last test/)).toHaveLength(0);
    expect(screen.getByLabelText('Shoulders')).toBeTruthy();
  });
});
