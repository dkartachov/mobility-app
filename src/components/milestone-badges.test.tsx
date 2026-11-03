import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { MILESTONE_HOURS } from '@/lib/milestones';

import { MilestoneBadges, shapePoints } from './milestone-badges';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('MilestoneBadges', () => {
  it('shows every milestone, marking only the ones reached', async () => {
    await render(<MilestoneBadges totalSeconds={3 * 3600} />);

    for (const hours of MILESTONE_HOURS) expect(screen.getByText(String(hours))).toBeTruthy();
    expect(screen.getByLabelText('1 hour, reached')).toBeTruthy();
    expect(screen.getByLabelText('3 hours, reached')).toBeTruthy();
    expect(screen.getByLabelText('5 hours, not reached yet')).toBeTruthy();
  });

  it('opens a reached badge on its own screen, but not one still to reach', async () => {
    await render(<MilestoneBadges totalSeconds={3 * 3600} />);

    await fireEvent.press(screen.getByLabelText('3 hours, reached'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/milestone-badge', params: { hours: 3 } });

    expect(screen.queryByRole('button', { name: '5 hours, not reached yet' })).toBeNull();
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('draws even the fanciest badges, still', async () => {
    await render(<MilestoneBadges totalSeconds={1000 * 3600} />);
    expect(screen.getByLabelText('200 hours, reached')).toBeTruthy();
  });
});

describe('shapePoints', () => {
  it('has a point per side, starting from the top', () => {
    const points = shapePoints(100, 6).split(' ');
    expect(points).toHaveLength(6);
    expect(points[0]).toBe('50,0');
  });

  it('doubles the points for a star, with every other one further in', () => {
    const points = shapePoints(100, 5, true).split(' ');
    expect(points).toHaveLength(10);
    const [x, y] = points[5].split(',').map(Number);
    expect(x).toBeCloseTo(50);
    expect(y).toBeCloseTo(82.5);
  });
});
