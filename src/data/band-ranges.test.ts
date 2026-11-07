import { bandRanges, normalQuantile, scoreResult } from './mobility-score';
import { FLEXIBILITY_TESTS } from './mobility-tests';

const kneeToChest = FLEXIBILITY_TESTS.find((t) => t.id === 'knee-to-chest')!;

describe('bandRanges', () => {
  it('gives the values each band covers, from the same norms as the score', () => {
    const ranges = bandRanges(kneeToChest, { sex: 'male', age: 30 });
    const edges = ranges.map(({ min, max }) => [min, max].map((v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : v)));
    expect(ranges.map((r) => r.band)).toEqual(['wellBelow', 'below', 'average', 'above', 'wellAbove']);
    expect(edges).toEqual([
      [-Infinity, 120],
      [120, 124.7],
      [124.7, 135.3],
      [135.3, 140],
      [140, Infinity],
    ]);
  });

  it('puts each edge at the percentile its band starts at', () => {
    const demographics = { sex: 'female', age: 52 } as const;
    const [, below, average, above] = bandRanges(kneeToChest, demographics);
    expect(scoreResult(below.min, kneeToChest.norm, demographics)).toBeCloseTo(10, 4);
    expect(scoreResult(average.min, kneeToChest.norm, demographics)).toBeCloseTo(25, 4);
    expect(scoreResult(above.min, kneeToChest.norm, demographics)).toBeCloseTo(75, 4);
    expect(scoreResult(above.max, kneeToChest.norm, demographics)).toBeCloseTo(90, 4);
  });
});

describe('normalQuantile', () => {
  it('inverts the normal distribution', () => {
    expect(normalQuantile(0.5)).toBeCloseTo(0, 6);
    expect(normalQuantile(0.9)).toBeCloseTo(1.2816, 3);
  });
});
