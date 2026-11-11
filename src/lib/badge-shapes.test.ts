import { badgeNumberScale, badgeShape } from './badge-shapes';
import { MILESTONE_HOURS } from './milestones';

/** Every coordinate in a path, as [x, y] pairs. */
function coordinates(path: string) {
  const numbers = (path.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  return numbers.flatMap((x, i) => (i % 2 === 0 ? [[x, numbers[i + 1]]] : []));
}

describe('badgeShape', () => {
  it('gives every milestone a silhouette of its own', () => {
    const silhouettes = MILESTONE_HOURS.map((hours) => badgeShape(hours).silhouette.join(' '));
    expect(new Set(silhouettes).size).toBe(MILESTONE_HOURS.length);
  });

  it('keeps every shape inside the square it is drawn in', () => {
    for (const hours of MILESTONE_HOURS) {
      for (const path of badgeShape(hours).silhouette) {
        for (const [x, y] of coordinates(path)) expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is the same left to right, so a badge looks right from behind', () => {
    for (const hours of MILESTONE_HOURS) {
      for (const path of badgeShape(hours).silhouette) {
        const points = coordinates(path);
        for (const [x, y] of points) {
          expect(points.some(([otherX, otherY]) => Math.abs(otherX + x) < 0.001 && Math.abs(otherY - y) < 0.001)).toBe(true);
        }
      }
    }
  });

  it('falls back to the first shape for an unknown milestone', () => {
    expect(badgeShape(2)).toBe(badgeShape(MILESTONE_HOURS[0]));
  });

  it('surrounds a gem’s table with facets, some lit and some in shadow', () => {
    const { detail } = badgeShape(125);
    if (detail.kind !== 'facets') throw new Error('expected a cut gem');
    expect(detail.facets).toHaveLength(8);
    expect(detail.facets.some((facet) => facet.light > 0)).toBe(true);
    expect(detail.facets.some((facet) => facet.light < 0)).toBe(true);
  });
});

describe('badgeNumberScale', () => {
  it('shrinks only three-digit numbers', () => {
    expect(badgeNumberScale(75)).toBe(1);
    expect(badgeNumberScale(100)).toBeLessThan(1);
  });
});
