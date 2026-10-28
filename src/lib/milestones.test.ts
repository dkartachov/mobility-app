import { MILESTONE_HOURS, milestoneProgress, milestoneReached } from './milestones';

const HOUR = 3600;

describe('milestoneProgress', () => {
  it('starts at 0 towards the first milestone', () => {
    expect(milestoneProgress(0)).toEqual({ previousHours: 0, nextHours: 1, progress: 0 });
  });

  it('measures progress between the surrounding milestones', () => {
    expect(milestoneProgress(4 * HOUR)).toEqual({ previousHours: 3, nextHours: 5, progress: 0.5 });
  });

  it('moves on to the next milestone exactly at a boundary', () => {
    expect(milestoneProgress(10 * HOUR)).toEqual({ previousHours: 10, nextHours: 15, progress: 0 });
  });

  it('is complete once every milestone is reached', () => {
    const last = MILESTONE_HOURS.at(-1)!;
    expect(milestoneProgress(last * HOUR)).toEqual({ previousHours: last, nextHours: null, progress: 1 });
    expect(milestoneProgress(10_000 * HOUR).nextHours).toBeNull();
  });
});

describe('milestoneReached', () => {
  it('returns null when no milestone is crossed', () => {
    expect(milestoneReached(0, 0.5 * HOUR)).toBeNull();
    expect(milestoneReached(HOUR, 2 * HOUR)).toBeNull();
  });

  it('counts landing exactly on a milestone, but not starting on one', () => {
    expect(milestoneReached(0.5 * HOUR, HOUR)).toBe(1);
    expect(milestoneReached(HOUR, 1.5 * HOUR)).toBeNull();
  });

  it('returns the highest milestone when several are crossed at once', () => {
    expect(milestoneReached(0, 6 * HOUR)).toBe(5);
  });
});

it('lists milestones in ascending order', () => {
  expect([...MILESTONE_HOURS].sort((a, b) => a - b)).toEqual(MILESTONE_HOURS);
});
