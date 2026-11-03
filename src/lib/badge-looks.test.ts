import { badgeLook } from './badge-looks';
import { MILESTONE_HOURS } from './milestones';

describe('badgeLook', () => {
  it('starts plain and ends with every effect', () => {
    const first = badgeLook(MILESTONE_HOURS[0]);
    expect(first.fill).toHaveLength(1);
    expect(first.ring ?? first.shine ?? first.glow ?? first.prism ?? first.sparkles).toBeUndefined();

    const last = badgeLook(MILESTONE_HOURS.at(-1)!);
    expect(last.fill.length).toBeGreaterThan(1);
    expect(last).toMatchObject({ shine: true, prism: true, sparkles: expect.any(String) });
  });

  it('gives every milestone its own look', () => {
    const looks = new Set(MILESTONE_HOURS.map(badgeLook));
    expect(looks.size).toBe(MILESTONE_HOURS.length);
  });
});
