import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { MobilityScore } from '@/data/mobility-score';
import type { PastTest } from '@/db/mobility-tests';

import { ScoreHistory } from './score-history';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const score = (overall: number, hips: number | null): MobilityScore => ({
  areas: { shoulders: overall, hips, hamstrings: overall, ankles: overall },
  tests: {},
  overall,
  errors: { areas: { shoulders: 1, hips: 1, hamstrings: 1, ankles: 1 }, overall: 1 },
});

// Newest first, as `getTestHistory` returns them.
const TESTS: PastTest[] = [
  {
    ...score(72, null),
    id: 3,
    date: '2026-10-01',
    previous: score(60, 40),
    changes: {
      overall: { points: 12, real: true, noise: 4 },
      areas: { shoulders: null, hips: null, hamstrings: null, ankles: null },
    },
  },
  { ...score(60, 40), id: 1, date: '2026-09-01', previous: null, changes: null },
];

describe('ScoreHistory', () => {
  it('lists every test with its overall score and change, opening one when tapped', async () => {
    await render(<ScoreHistory tests={TESTS} />);

    expect(screen.getAllByLabelText(/^October 1, 2026: 72, \+12 points$/)).toHaveLength(2);
    await fireEvent.press(screen.getAllByLabelText(/^September 1, 2026: 60$/)[0]);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/past-test/[id]', params: { id: 1 } });
  });

  it("charts an area's score, leaving out tests without one", async () => {
    await render(<ScoreHistory tests={TESTS} />);

    await fireEvent.press(screen.getByText('Hips'));

    expect(screen.getByLabelText(/^Hips score over time: Sep 1(, 2026)?, 40$/)).toBeTruthy();
    // The selected test falls back to the latest one with a hips score.
    expect(screen.getByLabelText(/^September 1, 2026: 40$/)).toBeTruthy();
  });
});
