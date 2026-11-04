/** The mobility score is broken down by the part of the body each test stretches. */

import {
  FLEXIBILITY_TESTS,
  METHOD_UNITS,
  type FlexibilityTest,
  type NormAtAge,
  type Sex,
  type Side,
  type TestNorm,
  type Unit,
} from './mobility-tests';

export type ScoreArea = 'shoulders' | 'hips' | 'hamstrings' | 'ankles';

export const SCORE_AREAS: { id: ScoreArea; label: string }[] = [
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'hips', label: 'Hips' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'ankles', label: 'Ankles' },
];

/** 0–100 for each area, `null` for an area with no results. */
export type AreaScores = Record<ScoreArea, number | null>;

export const NO_AREA_SCORES = Object.fromEntries(SCORE_AREAS.map(({ id }) => [id, null])) as AreaScores;

/**
 * 0–100 for one flexibility test, and for each side of a two-sided one. `error` is how far
 * measurement error alone typically moves the score, in score points (its standard error).
 */
export type TestScore = { score: number; error: number; sides: Partial<Record<Side, number>> };

export type MobilityScore = {
  areas: AreaScores;
  /** By test id, only for tests with results. */
  tests: Partial<Record<string, TestScore>>;
  /**
   * The average of the areas that have a score, `null` when none do. An average of percentiles
   * rather than a percentile itself: scoring 84 on every test is rarer than 84% of people.
   */
  overall: number | null;
  /** Standard errors of the area and overall scores, in score points, `null` where they have none. */
  errors: { areas: AreaScores; overall: number | null };
};

/** One saved test result, as stored with a flexibility test. */
export type ScoredResult = { exerciseId: string; side: Side | null; value: number; unit: Unit };

const average = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

/** Standard error of the average of values with independent standard errors `errors`. */
const averageError = (errors: number[]) =>
  errors.length ? Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0)) / errors.length : null;

/** Who results are compared with. `null` where unknown: both sexes, or the youngest adults. */
export type Demographics = { sex: Sex | null; age: number | null };

/** The average and standard deviation of results among people of `demographics`. */
export function normAt({ byAge }: TestNorm, { sex, age }: Demographics) {
  const bySex = (values: Record<Sex, number>) => (sex ? values[sex] : (values.male + values.female) / 2);
  const at = (point: NormAtAge) => ({ mean: bySex(point.mean), sd: bySex(point.sd) });
  const next = byAge.findIndex((point) => point.age > (age ?? 0));
  if (next === 0) return at(byAge[0]);
  if (next === -1) return at(byAge[byAge.length - 1]);
  const [from, to] = [at(byAge[next - 1]), at(byAge[next])];
  const t = (age! - byAge[next - 1].age) / (byAge[next].age - byAge[next - 1].age);
  return { mean: from.mean + (to.mean - from.mean) * t, sd: from.sd + (to.sd - from.sd) * t };
}

/** Share of a standard normal distribution below `z` (Abramowitz & Stegun 26.2.17, error under 1e-7). */
export function normalCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const tail =
    Math.exp((-z * z) / 2) *
    0.3989422804014327 *
    t *
    (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - tail : tail;
}

/**
 * A result's score, 0–100: the percentile it falls at among healthy adults of the same sex and
 * age, so 50 is average and 84 is one standard deviation better than average.
 */
export function scoreResult(value: number, norm: TestNorm, demographics: Demographics) {
  const { mean, sd } = normAt(norm, demographics);
  return normalCdf((value - mean) / sd) * 100;
}

/**
 * How far the test's measurement error moves a result's score, in score points: the error times
 * how steeply the score climbs at that result, which is steepest at average and flattens towards
 * either end.
 */
export function scoreError(value: number, test: FlexibilityTest, demographics: Demographics) {
  const { mean, sd } = normAt(test.norm, demographics);
  const z = (value - mean) / sd;
  return Math.exp((-z * z) / 2) * 0.3989422804014327 * (test.measurementError / sd) * 100;
}

/** How a score compares with healthy adults, by percentile. */
export type ScoreBand = 'wellBelow' | 'below' | 'average' | 'above' | 'wellAbove';

/**
 * The lowest score in each band, highest first: the middle half of adults is average, and the
 * top and bottom 10% are well above and well below.
 */
const SCORE_BANDS: [from: number, band: ScoreBand][] = [
  [90, 'wellAbove'],
  [75, 'above'],
  [25, 'average'],
  [10, 'below'],
  [0, 'wellBelow'],
];

export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  wellAbove: 'Well above average',
  above: 'Above average',
  average: 'Average',
  below: 'Below average',
  wellBelow: 'Well below average',
};

export function scoreBand(score: number): ScoreBand {
  return SCORE_BANDS.find(([from]) => score >= from)![1];
}

/**
 * Scores one flexibility test's results against people of `demographics`. Each side is scored on
 * its own, each test scores the average of its sides, and each area the average of its tests.
 * Results in another unit than the test's are left out. Each score's error comes from its
 * results' errors the same way, taking measurement errors to be independent.
 */
export function mobilityScore(results: ScoredResult[], demographics: Demographics): MobilityScore {
  const tests: Partial<Record<string, TestScore>> = {};
  const byArea = new Map<ScoreArea, TestScore[]>();
  for (const test of FLEXIBILITY_TESTS) {
    const scored = results
      .filter((r) => r.exerciseId === test.id && r.unit === METHOD_UNITS[test.method.kind])
      .map((r) => ({
        side: r.side,
        score: scoreResult(r.value, test.norm, demographics),
        error: scoreError(r.value, test, demographics),
      }));
    const score = average(scored.map((r) => r.score));
    if (score === null) continue;
    const sides: TestScore['sides'] = {};
    for (const side of ['left', 'right'] as const) {
      const sideScore = average(scored.filter((r) => r.side === side).map((r) => r.score));
      if (sideScore !== null) sides[side] = sideScore;
    }
    const testScore = { score, error: averageError(scored.map((r) => r.error))!, sides };
    tests[test.id] = testScore;
    byArea.set(test.area, [...(byArea.get(test.area) ?? []), testScore]);
  }
  const areas = {} as AreaScores;
  const areaErrors = {} as AreaScores;
  for (const { id } of SCORE_AREAS) {
    const areaTests = byArea.get(id) ?? [];
    areas[id] = average(areaTests.map((t) => t.score));
    areaErrors[id] = averageError(areaTests.map((t) => t.error));
  }
  const scoredAreas = SCORE_AREAS.filter(({ id }) => areas[id] !== null);
  return {
    areas,
    tests,
    overall: average(scoredAreas.map(({ id }) => areas[id]!)),
    errors: { areas: areaErrors, overall: averageError(scoredAreas.map(({ id }) => areaErrors[id]!)) },
  };
}

/** A score's change since the previous test. */
export type ScoreChange = {
  /** In score points, from the rounded scores so it matches the numbers shown. */
  points: number;
  /**
   * Bigger than measurement error would explain: a change this big happens less than 5% of the
   * time when flexibility hasn't changed. Smaller changes are shown as no real change.
   */
  real: boolean;
};

export type ScoreChanges = {
  overall: ScoreChange | null;
  /** `null` for an area without a score in either test. */
  areas: Record<ScoreArea, ScoreChange | null>;
};

/** How far a normal distribution reaches either side of its mean to cover 95% of it, in SDs. */
const Z_95 = 1.959964;

function scoreChange(current: number | null, currentError: number | null, previous: number | null, previousError: number | null) {
  if (current === null || previous === null) return null;
  // The difference of two scores with independent errors has the error of both combined.
  const noise = Z_95 * Math.hypot(currentError ?? 0, previousError ?? 0);
  return { points: Math.round(current) - Math.round(previous), real: Math.abs(current - previous) > noise };
}

/** Changes in the overall and area scores from `previous` to `current`. */
export function compareScores(current: MobilityScore, previous: MobilityScore): ScoreChanges {
  return {
    overall: scoreChange(current.overall, current.errors.overall, previous.overall, previous.errors.overall),
    areas: Object.fromEntries(
      SCORE_AREAS.map(({ id }) => [
        id,
        scoreChange(current.areas[id], current.errors.areas[id], previous.areas[id], previous.errors.areas[id]),
      ])
    ) as ScoreChanges['areas'],
  };
}

/**
 * How far apart readings of the same stretch, taken one after the other, can be before one of them
 * is probably off, say from the phone slipping or not going as far: two readings differ by more
 * than this less than 5% of the time with the test's measurement error alone. That error is from
 * retests days apart, so this is generous for readings a minute apart.
 */
export function maxReadingGap(test: FlexibilityTest) {
  return Z_95 * Math.SQRT2 * test.measurementError;
}

/** "+12 pts", "−8 pts" or "0 pts", or with `unit` spelled out for screen readers. */
export function formatScoreChange(points: number, unit = 'pts') {
  return `${points > 0 ? '+' : points < 0 ? '−' : ''}${Math.abs(points)} ${unit}`;
}

/** Colors from a score of 0 (red) through yellow to 100 (green), for gradients and interpolation. */
export const SCORE_COLORS = ['#E5484D', '#F5C518', '#30A46C'] as const;
export const SCORE_COLOR_STOPS = [0, 0.5, 1];
