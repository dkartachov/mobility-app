import {
  compareScores,
  explainNoRealChange,
  focusAreas,
  formatScoreChange,
  maxReadingGap,
  mobilityScore,
  normalCdf,
  normAt,
  SCORE_AREAS,
  SCORE_BAND_LABELS,
  SCORE_COLOR_STOPS,
  SCORE_COLORS,
  scoreBand,
  scoreError,
  scoreResult,
  type Demographics,
  type MobilityScore,
  type ScoreBand,
} from './mobility-score';
import { FLEXIBILITY_TESTS, NORM_PEAK_AGE, OLDEST_NORM_AGE, type TestNorm } from './mobility-tests';

// Steady to 30, then 2 (men) and 4 (women) a decade less until 80.
const NORM: TestNorm = {
  byAge: [
    { age: NORM_PEAK_AGE, mean: { male: 40, female: 50 }, sd: { male: 10, female: 10 } },
    { age: OLDEST_NORM_AGE, mean: { male: 30, female: 30 }, sd: { male: 10, female: 10 } },
  ],
  evidence: 'strong',
};
const ANYONE: Demographics = { sex: null, age: null };

describe('focusAreas', () => {
  it('picks the two lowest scoring areas, lowest first', () => {
    expect(focusAreas({ shoulders: 40, hips: 20, hamstrings: 70, ankles: 30 })).toEqual(['hips', 'ankles']);
  });

  it('leaves out areas without a score', () => {
    expect(focusAreas({ shoulders: null, hips: 60, hamstrings: null, ankles: null })).toEqual(['hips']);
  });

  it('breaks ties in area order', () => {
    expect(focusAreas({ shoulders: 50, hips: 50, hamstrings: 50, ankles: 50 })).toEqual(['shoulders', 'hips']);
  });
});

describe('normalCdf', () => {
  it('matches the standard normal distribution', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 7);
    expect(normalCdf(1)).toBeCloseTo(0.8413447, 6);
    expect(normalCdf(-1.959964)).toBeCloseTo(0.025, 6);
    expect(normalCdf(3)).toBeCloseTo(0.9986501, 6);
  });
});

describe('normAt', () => {
  it('uses the average for the sex, or of both sexes when unknown', () => {
    expect(normAt(NORM, { sex: 'male', age: null }).mean).toBe(40);
    expect(normAt(NORM, { sex: 'female', age: null }).mean).toBe(50);
    expect(normAt(NORM, ANYONE).mean).toBe(45);
  });

  it('changes between the ages it has, and holds before the first and after the last', () => {
    expect(normAt(NORM, { sex: 'male', age: 20 }).mean).toBe(40);
    expect(normAt(NORM, { sex: 'male', age: NORM_PEAK_AGE }).mean).toBe(40);
    expect(normAt(NORM, { sex: 'male', age: 55 }).mean).toBe(35);
    expect(normAt(NORM, { sex: 'female', age: 55 }).mean).toBe(40);
    expect(normAt(NORM, { sex: null, age: 55 }).mean).toBe(37.5);
    expect(normAt(NORM, { sex: 'male', age: 95 }).mean).toBe(30);
  });

  it('interpolates the SD of each sex too', () => {
    const norm: TestNorm = {
      byAge: [
        { age: 20, mean: { male: 10, female: 10 }, sd: { male: 4, female: 2 } },
        { age: 40, mean: { male: 8, female: 6 }, sd: { male: 2, female: 2 } },
        { age: 60, mean: { male: 6, female: 4 }, sd: { male: 2, female: 1 } },
      ],
      evidence: 'strong',
    };
    expect(normAt(norm, { sex: 'male', age: 30 })).toEqual({ mean: 9, sd: 3 });
    expect(normAt(norm, { sex: 'female', age: 50 })).toEqual({ mean: 5, sd: 1.5 });
    expect(normAt(norm, { sex: null, age: 30 })).toEqual({ mean: 8.5, sd: 2.5 });
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

describe('scoreError', () => {
  const TEST = { ...FLEXIBILITY_TESTS[0], norm: NORM, measurementError: 2 };

  it('is the measurement error times the slope of the score', () => {
    // At average the score climbs 100 × 0.3989 points per SD, and 2 is a fifth of an SD.
    expect(scoreError(45, TEST, ANYONE)).toBeCloseTo(7.98, 2);
  });

  it('shrinks towards either end, where the score barely moves', () => {
    expect(scoreError(65, TEST, ANYONE)).toBeLessThan(scoreError(55, TEST, ANYONE));
    expect(scoreError(25, TEST, ANYONE)).toBeCloseTo(scoreError(65, TEST, ANYONE));
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
  // Men at 25: knee to wall 11 ± 3.6 cm, hip abduction 41° ± 8.3°, knee to chest 130° ± 7.8°, sit and
  // reach 1.5 cm short of the toes ± 10 cm.
  const MAN: Demographics = { sex: 'male', age: 25 };

  it('averages sides, then tests within an area, then areas', () => {
    const score = mobilityScore(
      [
        // Ankles: one SD below average on the left, one above on the right.
        { exerciseId: 'knee-to-wall', side: 'left', value: 7.4, unit: 'cm' },
        { exerciseId: 'knee-to-wall', side: 'right', value: 14.6, unit: 'cm' },
        // Hips: hip abduction one SD above, knee to chest one SD below, on both sides.
        { exerciseId: 'hip-abduction', side: 'left', value: 49.3, unit: 'deg' },
        { exerciseId: 'hip-abduction', side: 'right', value: 49.3, unit: 'deg' },
        { exerciseId: 'knee-to-chest', side: 'left', value: 122.2, unit: 'deg' },
        { exerciseId: 'knee-to-chest', side: 'right', value: 122.2, unit: 'deg' },
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
        { exerciseId: 'knee-to-wall', side: 'left', value: 7.4, unit: 'cm' },
        { exerciseId: 'knee-to-wall', side: 'right', value: 14.6, unit: 'cm' },
        { exerciseId: 'sit-and-reach', side: null, value: -1.5, unit: 'cm' },
      ],
      MAN
    );
    expect(score.tests['knee-to-wall']).toEqual({
      score: expect.closeTo(50),
      error: expect.any(Number),
      sides: { left: expect.closeTo(15.87, 2), right: expect.closeTo(84.13, 2) },
      results: [
        { side: 'left', value: 7.4, unit: 'cm' },
        { side: 'right', value: 14.6, unit: 'cm' },
      ],
    });
    expect(score.tests['sit-and-reach']).toEqual({
      score: expect.closeTo(50),
      error: expect.any(Number),
      sides: {},
      results: [{ side: null, value: -1.5, unit: 'cm' }],
    });
    expect(score.tests['knee-to-chest']).toBeUndefined();
  });

  it('combines errors so that averaging more results makes a score steadier', () => {
    const atAverage = (side: 'left' | 'right') => ({ exerciseId: 'knee-to-wall', side, value: 11, unit: 'cm' as const });
    const one = mobilityScore([atAverage('left')], MAN);
    const both = mobilityScore([atAverage('left'), atAverage('right')], MAN);
    // 0.7 cm on an SD of 3.6 cm, at average.
    expect(one.tests['knee-to-wall']!.error).toBeCloseTo(100 * 0.3989 * (0.7 / 3.6), 1);
    expect(both.tests['knee-to-wall']!.error).toBeCloseTo(one.tests['knee-to-wall']!.error / Math.SQRT2);
    expect(both.errors.areas.ankles).toBeCloseTo(both.tests['knee-to-wall']!.error);
    expect(both.errors.overall).toBeCloseTo(both.tests['knee-to-wall']!.error);
    expect(both.errors.areas.hips).toBeNull();
  });

  it('leaves out results in a unit the test no longer uses', () => {
    const score = mobilityScore([{ exerciseId: 'knee-to-wall', side: 'left', value: 40, unit: 'deg' }], MAN);
    expect(score.areas.ankles).toBeNull();
    expect(score.overall).toBeNull();
  });
});

describe('compareScores', () => {
  const NO_AREAS = { shoulders: null, hips: null, hamstrings: null, ankles: null };
  /** A score with only hips, for an overall of `overall` with a standard error of `error`. */
  const hipsOnly = (overall: number, error: number): MobilityScore => ({
    areas: { ...NO_AREAS, hips: overall },
    tests: {},
    overall,
    errors: { areas: { ...NO_AREAS, hips: error }, overall: error },
  });

  it('compares the rounded scores', () => {
    expect(compareScores(hipsOnly(60.4, 1), hipsOnly(50.6, 1)).overall?.points).toBe(9);
    expect(compareScores(hipsOnly(40, 1), hipsOnly(52, 1)).overall?.points).toBe(-12);
  });

  it('counts a change as real only past 95% of what measurement error could do', () => {
    // Errors of 3 points each combine to 4.24, so the cut-off is 8.3 points.
    expect(compareScores(hipsOnly(58, 3), hipsOnly(50, 3)).overall).toMatchObject({ points: 8, real: false });
    expect(compareScores(hipsOnly(59, 3), hipsOnly(50, 3)).overall).toMatchObject({ points: 9, real: true });
    expect(compareScores(hipsOnly(41, 3), hipsOnly(50, 3)).overall).toMatchObject({ points: -9, real: true });
    expect(compareScores(hipsOnly(50, 3), hipsOnly(50, 3)).overall).toMatchObject({ points: 0, real: false });
  });

  it('says how big a change measurement error could explain', () => {
    expect(compareScores(hipsOnly(58, 3), hipsOnly(50, 3)).overall?.noise).toBeCloseTo(1.96 * Math.hypot(3, 3), 2);
  });

  it('compares each area, null where either test has no score', () => {
    const { areas } = compareScores(hipsOnly(70, 1), hipsOnly(50, 1));
    expect(areas.hips).toMatchObject({ points: 20, real: true });
    expect(areas.ankles).toBeNull();
  });
});

describe('explainNoRealChange', () => {
  it('gives the change and how much measuring alone could move the score', () => {
    const { title, message } = explainNoRealChange({ points: 3, real: false, noise: 8.3 });
    expect(title).toBe('Why no real change?');
    expect(message).toMatch(/^Your score went up 3 points, /);
    expect(message).toContain('up to 8 points');
  });

  it('reads naturally for no change, one point and a drop', () => {
    expect(explainNoRealChange({ points: 0, real: false, noise: 6 }).message).toMatch(/^Your score didn't change, /);
    expect(explainNoRealChange({ points: -1, real: false, noise: 6 }).message).toMatch(/^Your score went down 1 point, /);
  });
});

it('allows readings as far apart as the measurement error explains 95% of the time', () => {
  const test = { ...FLEXIBILITY_TESTS[0], measurementError: 6.3 };
  expect(maxReadingGap(test)).toBeCloseTo(17.46, 2);
});

it('formats changes in points with a sign', () => {
  expect(formatScoreChange(12)).toBe('+12 pts');
  expect(formatScoreChange(-8)).toBe('−8 pts');
  expect(formatScoreChange(0)).toBe('0 pts');
  expect(formatScoreChange(3, 'points')).toBe('+3 points');
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

it('has a sensible norm and measurement error for every test', () => {
  for (const { id, norm, measurementError } of FLEXIBILITY_TESTS) {
    const ages = norm.byAge.map((point) => point.age);
    expect([id, ages]).toEqual([id, [...ages].sort((a, b) => a - b)]);
    expect([id, new Set(ages).size]).toEqual([id, ages.length]);
    for (const { sd } of norm.byAge) expect([id, sd.male > 0 && sd.female > 0]).toEqual([id, true]);
    // Flexibility is no better in the oldest than the youngest.
    const [youngest, oldest] = [norm.byAge[0], norm.byAge[norm.byAge.length - 1]];
    expect([id, oldest.mean.male <= youngest.mean.male && oldest.mean.female <= youngest.mean.female]).toEqual([id, true]);
    // Well under the spread between people, or the test couldn't tell anyone apart: a reliability
    // (ICC, 1 − (error / SD)²) of at least 0.7, the usual bar for an acceptable test.
    const sd = Math.min(youngest.sd.male, youngest.sd.female);
    expect([id, measurementError > 0 && 1 - (measurementError / sd) ** 2 >= 0.7]).toEqual([id, true]);
  }
});
