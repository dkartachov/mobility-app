import { mobilityScore, SCORE_AREAS, SCORE_COLOR_STOPS, SCORE_COLORS, scoreResult } from './mobility-score';
import { FLEXIBILITY_TESTS } from './mobility-tests';

describe('scoreResult', () => {
  it('scales linearly between the ends and clamps past them', () => {
    expect(scoreResult(0, { zeroAt: 0, fullAt: 20 })).toBe(0);
    expect(scoreResult(5, { zeroAt: 0, fullAt: 20 })).toBe(25);
    expect(scoreResult(30, { zeroAt: 0, fullAt: 20 })).toBe(100);
    expect(scoreResult(-5, { zeroAt: 0, fullAt: 20 })).toBe(0);
  });

  it('scores higher for smaller values when smaller is better', () => {
    expect(scoreResult(30, { zeroAt: 30, fullAt: -20 })).toBe(0);
    expect(scoreResult(5, { zeroAt: 30, fullAt: -20 })).toBe(50);
    expect(scoreResult(-20, { zeroAt: 30, fullAt: -20 })).toBe(100);
  });
});

describe('mobilityScore', () => {
  it('averages sides, then tests within an area, then areas', () => {
    const score = mobilityScore([
      // Ankles: sides 0 and 15 cm average to 7.5 cm, half the range.
      { exerciseId: 'knee-to-wall', value: 0, unit: 'cm' },
      { exerciseId: 'knee-to-wall', value: 15, unit: 'cm' },
      // Hips: straddle at full, butterfly at zero.
      { exerciseId: 'straddle', value: 150, unit: 'deg' },
      { exerciseId: 'butterfly', value: 35, unit: 'cm' },
    ]);
    expect(score.areas.ankles).toBe(50);
    expect(score.areas.hips).toBe(50);
    expect(score.areas.shoulders).toBeNull();
    expect(score.overall).toBe(50);
  });

  it('leaves out results in a unit the test no longer uses', () => {
    const score = mobilityScore([{ exerciseId: 'knee-to-wall', value: 0.5, unit: 'slider' as 'cm' }]);
    expect(score.areas.ankles).toBeNull();
    expect(score.overall).toBeNull();
  });
});

it('has a test for every score area', () => {
  for (const { id } of SCORE_AREAS) expect(FLEXIBILITY_TESTS.some((t) => t.area === id)).toBe(true);
});

it('has a stop for every score color', () => {
  expect(SCORE_COLOR_STOPS).toHaveLength(SCORE_COLORS.length);
});
