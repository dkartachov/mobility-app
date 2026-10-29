import {
  formatScoreChange,
  mobilityScore,
  SCORE_AREAS,
  SCORE_COLOR_STOPS,
  SCORE_COLORS,
  scoreChange,
  scoreResult,
} from './mobility-score';
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
      // Ankles: left at zero, right at full.
      { exerciseId: 'ankle-lunge', side: 'left', value: 25, unit: 'deg' },
      { exerciseId: 'ankle-lunge', side: 'right', value: 50, unit: 'deg' },
      // Hips: straddle at full, knee to chest at zero on both sides.
      { exerciseId: 'straddle', side: null, value: 150, unit: 'deg' },
      { exerciseId: 'knee-to-chest', side: 'left', value: 70, unit: 'deg' },
      { exerciseId: 'knee-to-chest', side: 'right', value: 70, unit: 'deg' },
    ]);
    expect(score.areas.ankles).toBe(50);
    expect(score.areas.hips).toBe(50);
    expect(score.areas.shoulders).toBeNull();
    expect(score.overall).toBe(50);
  });

  it('scores each test and each of its sides', () => {
    const score = mobilityScore([
      { exerciseId: 'ankle-lunge', side: 'left', value: 25, unit: 'deg' },
      { exerciseId: 'ankle-lunge', side: 'right', value: 50, unit: 'deg' },
      { exerciseId: 'straddle', side: null, value: 105, unit: 'deg' },
    ]);
    expect(score.tests['ankle-lunge']).toEqual({ score: 50, sides: { left: 0, right: 100 } });
    expect(score.tests.straddle).toEqual({ score: 50, sides: {} });
    expect(score.tests['knee-to-chest']).toBeUndefined();
  });

  it('scores each side before averaging, so one side past full scores no more than 100', () => {
    const score = mobilityScore([
      { exerciseId: 'ankle-lunge', side: 'left', value: 75, unit: 'deg' },
      { exerciseId: 'ankle-lunge', side: 'right', value: 25, unit: 'deg' },
    ]);
    expect(score.tests['ankle-lunge']?.score).toBe(50);
  });

  it('leaves out results in a unit the test no longer uses', () => {
    const score = mobilityScore([{ exerciseId: 'ankle-lunge', side: 'left', value: 10, unit: 'cm' }]);
    expect(score.areas.ankles).toBeNull();
    expect(score.overall).toBeNull();
  });
});

describe('scoreChange', () => {
  it('compares the rounded scores', () => {
    expect(scoreChange(60.4, 50.6)).toBe(9);
    expect(scoreChange(40, 52)).toBe(-12);
  });

  it('is null without both scores', () => {
    expect(scoreChange(null, 50)).toBeNull();
    expect(scoreChange(50, null)).toBeNull();
    expect(scoreChange(50, undefined)).toBeNull();
  });
});

it('formats changes with a sign', () => {
  expect(formatScoreChange(12)).toBe('+12%');
  expect(formatScoreChange(-8)).toBe('−8%');
  expect(formatScoreChange(0)).toBe('0%');
});

it('has a test for every score area, each testing a different movement', () => {
  for (const { id } of SCORE_AREAS) {
    const movements = FLEXIBILITY_TESTS.filter((t) => t.area === id).map((t) => t.movement);
    expect(new Set(movements).size).toBe(movements.length);
  }
  for (const { id } of SCORE_AREAS) expect(FLEXIBILITY_TESTS.some((t) => t.area === id)).toBe(true);
});

it('has a stop for every score color', () => {
  expect(SCORE_COLOR_STOPS).toHaveLength(SCORE_COLORS.length);
});
