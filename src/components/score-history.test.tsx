import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { MobilityScore } from '@/data/mobility-score';
import type { PastTest } from '@/db/mobility-tests';
import { addDays, todayKey } from '@/lib/dates';

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
    demographics: { sex: null, age: null },
    previous: score(60, 40),
    changes: {
      overall: { points: 12, real: true, noise: 4 },
      areas: { shoulders: null, hips: null, hamstrings: null, ankles: null },
    },
  },
  {
    ...score(60, 40),
    id: 1,
    date: '2026-09-01',
    demographics: { sex: null, age: null },
    previous: null,
    changes: null,
  },
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

/** A test with an overall score of `overall`, taken `daysAgo` days before today. */
const testFrom = (id: number, daysAgo: number, overall: number): PastTest => ({
  ...score(overall, overall),
  id,
  date: addDays(todayKey(), -daysAgo),
  demographics: { sex: null, age: null },
  previous: null,
  changes: null,
});

// One a month for two years, newest first.
const MONTHLY = Array.from({ length: 24 }, (_, i) => testFrom(100 + i, i * 30 + 1, 50 + i));

describe('ScoreHistory over a long time', () => {
  const chartedScores = () =>
    (screen.getByLabelText(/^Overall score over time: /).props.accessibilityLabel as string).split('; ').length;

  it('only offers a time range once there is more than 6 months of tests', async () => {
    await render(<ScoreHistory tests={TESTS.map((t, i) => ({ ...t, date: addDays(todayKey(), -i * 30) }))} />);
    expect(screen.queryByLabelText('Last year')).toBeNull();
  });

  it('charts the last year to start with, and the last 6 months or every test on request', async () => {
    await render(<ScoreHistory tests={MONTHLY} />);
    expect(chartedScores()).toBe(13);

    await fireEvent.press(screen.getByLabelText('Last 6 months'));
    expect(chartedScores()).toBe(7);

    await fireEvent.press(screen.getByLabelText('All tests'));
    expect(chartedScores()).toBe(24);
  });

  it('lists only the latest tests, with a link to all of them', async () => {
    await render(<ScoreHistory tests={MONTHLY} />);

    // The latest also shows above the chart.
    expect(screen.getAllByLabelText(/^\w+ \d+, \d{4}: 50$/)).toHaveLength(2);
    expect(screen.queryByLabelText(/: 55$/)).toBeNull();
    await fireEvent.press(screen.getByLabelText('See all 24 tests'));
    expect(router.push).toHaveBeenCalledWith('/test-history');
  });
});
