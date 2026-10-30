import {
  expectedResult,
  formatScoreChange,
  mobilityScore,
  normalCdf,
  SCORE_AREAS,
  SCORE_BAND_LABELS,
  SCORE_COLOR_STOPS,
  SCORE_COLORS,
  scoreBand,
  scoreChange,
  scoreResult,
  type Demographics,
  type ScoreBand,
} from './mobility-score';
import { FLEXIBILITY_TESTS, NORM_PEAK_AGE, type TestNorm } from './mobility-tests';

const NORM: TestNorm = {
  mean: { male: 40, female: 50 },
  sd: 10,
  perDecade: { male: -2, female: -4 },
  evidence: 'strong',
};
const ANYONE: Demographics = { sex: null, age: null };

describe('normalCdf', () => {
  it('matches the standard normal distribution', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 7);
    expect(normalCdf(1)).toBeCloseTo(0.8413447, 6);
    expect(normalCdf(-1.959964)).toBeCloseTo(0.025, 6);
    expect(normalCdf(3)).toBeCloseTo(0.9986501, 6);
  });
});

describe('expectedResult', () => {
  it('uses the average for the sex, or of both sexes when unknown', () => {
    expect(expectedResult(NORM, { sex: 'male', age: null })).toBe(40);
    expect(expectedResult(NORM, { sex: 'female', age: null })).toBe(50);
    expect(expectedResult(NORM, ANYONE)).toBe(45);
  });

  it('changes by decade past the peak age only, up to the oldest norm age', () => {
    expect(expectedResult(NORM, { sex: 'male', age: 20 })).toBe(40);
    expect(expectedResult(NORM, { sex: 'male', age: NORM_PEAK_AGE })).toBe(40);
    expect(expectedResult(NORM, { sex: 'male', age: 55 })).toBe(35);
    expect(expectedResult(NORM, { sex: 'female', age: 55 })).toBe(40);
    expect(expectedResult(NORM, { sex: null, age: 55 })).toBe(37.5);
    expect(expectedResult(NORM, { sex: 'male', age: 95 })).toBe(expectedResult(NORM, { sex: 'male', age: 80 }));
  });
});

describe('scoreResult', () => {
  it('scores the percentile of the result', () => {
    expect(scoreResult(45, NORM, ANYONE)).toBeCloseTo(50);
    expect(scoreResult(55, NORM, ANYONE)).toBeCloseTo(84.13, 2);
    expect(scoreResult(35, NORM, ANYONE)).toBeCloseTo(15.87, 2);
  });

  it('compares with people of the same sex and age', () => {
    expect(scoreResult(40, NORM, { sex: 'male', age: 30 })).toBeCloseTo(50);
    expect(scoreResult(40, NORM, { sex: 'female', age: 30 })).toBeCloseTo(15.87, 2);
    expect(scoreResult(30, NORM, { sex: 'male', age: 80 })).toBeCloseTo(50);
  });

  it('stays within 0–100', () => {
    expect(scoreResult(1000, NORM, ANYONE)).toBeLessThanOrEqual(100);
    expect(scoreResult(-1000, NORM, ANYONE)).toBeGreaterThanOrEqual(0);
  });
});

it('bands scores by percentile', () => {
  expect(scoreBand(0)).toBe('wellBelow');
  expect(scoreBand(9.9)).toBe('wellBelow');
  expect(scoreBand(10)).toBe('below');
  expect(scoreBand(25)).toBe('average');
  expect(scoreBand(50)).toBe('average');
  expect(scoreBand(75)).toBe('above');
  expect(scoreBand(90)).toBe('wellAbove');
  expect(scoreBand(100)).toBe('wellAbove');
  for (const band of Object.keys(SCORE_BAND_LABELS)) expect(SCORE_BAND_LABELS[band as ScoreBand]).toBeTruthy();
});

describe('mobilityScore', () => {
  // Men at 30: knee to wall 11 ± 3 cm, hip abduction 42° ± 10°, knee to chest 130° ± 10°, sit and
  // reach 1.5 cm short of the toes ± 10 cm.
  const MAN: Demographics = { sex: 'male', age: 30 };

  it('averages sides, then tests within an area, then areas', () => {
    const score = mobilityScore(
      [
        // Ankles: one SD below average on the left, one above on the right.
        { exerciseId: 'knee-to-wall', side: 'left', value: 8, unit: 'cm' },
        { exerciseId: 'knee-to-wall', side: 'right', value: 14, unit: 'cm' },
        // Hips: hip abduction one SD above, knee to chest one SD below, on both sides.
        { exerciseId: 'hip-abduction', side: 'left', value: 52, unit: 'deg' },
        { exerciseId: 'hip-abduction', side: 'right', value: 52, unit: 'deg' },
        { exerciseId: 'knee-to-chest', side: 'left', value: 120, unit: 'deg' },
        { exerciseId: 'knee-to-chest', side: 'right', value: 120, unit: 'deg' },
      ],
      MAN
    );
    expect(score.areas.ankles).toBeCloseTo(50);
    expect(score.areas.hips).toBeCloseTo(50);
    expect(score.areas.shoulders).toBeNull();
    expect(score.overall).toBeCloseTo(50);
  });

  it('scores each test and each of its sides', () => {
    const score = mobilityScore(
      [
        { exerciseId: 'knee-to-wall', side: 'left', value: 8, unit: 'cm' },
        { exerciseId: 'knee-to-wall', side: 'right', value: 14, unit: 'cm' },
        { exerciseId: 'sit-and-reach', side: null, value: -1.5, unit: 'cm' },
      ],
      MAN
    );
    expect(score.tests['knee-to-wall']).toEqual({
      score: expect.closeTo(50),
      sides: { left: expect.closeTo(15.87, 2), right: expect.closeTo(84.13, 2) },
    });
    expect(score.tests['sit-and-reach']).toEqual({ score: expect.closeTo(50), sides: {} });
    expect(score.tests['knee-to-chest']).toBeUndefined();
  });

  it('leaves out results in a unit the test no longer uses', () => {
    const score = mobilityScore([{ exerciseId: 'knee-to-wall', side: 'left', value: 40, unit: 'deg' }], MAN);
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

it('has a sensible norm for every test', () => {
  for (const { id, norm } of FLEXIBILITY_TESTS) {
    expect([id, norm.sd > 0]).toEqual([id, true]);
    // Flexibility declines with age.
    expect([id, norm.perDecade.male <= 0 && norm.perDecade.female <= 0]).toEqual([id, true]);
  }
});
