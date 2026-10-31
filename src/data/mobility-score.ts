/** The mobility score is broken down by the part of the body each test stretches. */

import {
  FLEXIBILITY_TESTS,
  METHOD_UNITS,
  NORM_PEAK_AGE,
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

/** 0–100 for one flexibility test, and for each side of a two-sided one. */
export type TestScore = { score: number; sides: Partial<Record<Side, number>> };

export type MobilityScore = {
  areas: AreaScores;
  /** By test id, only for tests with results. */
  tests: Partial<Record<string, TestScore>>;
  /** The average of the areas that have a score, `null` when none do. */
  overall: number | null;
};

/** One saved test result, as stored with a flexibility test. */
export type ScoredResult = { exerciseId: string; side: Side | null; value: number; unit: Unit };

const average = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

/** Who results are compared with. `null` where unknown: both sexes, or adults up to the peak age. */
export type Demographics = { sex: Sex | null; age: number | null };

/** Norms come from adults, so ages past this are compared as this age. */
const OLDEST_NORM_AGE = 80;

/** The average result for someone of `demographics`, from the norm's average and age decline. */
export function expectedResult(norm: TestNorm, { sex, age }: Demographics) {
  const mean = sex ? norm.mean[sex] : (norm.mean.male + norm.mean.female) / 2;
  const perDecade = sex ? norm.perDecade[sex] : (norm.perDecade.male + norm.perDecade.female) / 2;
  const decades = Math.max(0, Math.min(age ?? 0, OLDEST_NORM_AGE) - NORM_PEAK_AGE) / 10;
  return mean + perDecade * decades;
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
  return normalCdf((value - expectedResult(norm, demographics)) / norm.sd) * 100;
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
 * Results in another unit than the test's are left out.
 */
export function mobilityScore(results: ScoredResult[], demographics: Demographics): MobilityScore {
  const tests: Partial<Record<string, TestScore>> = {};
  const areaScores = new Map<ScoreArea, number[]>();
  for (const test of FLEXIBILITY_TESTS) {
    const scored = results
      .filter((r) => r.exerciseId === test.id && r.unit === METHOD_UNITS[test.method.kind])
      .map((r) => ({ side: r.side, score: scoreResult(r.value, test.norm, demographics) }));
    const score = average(scored.map((r) => r.score));
    if (score === null) continue;
    const sides: TestScore['sides'] = {};
    for (const side of ['left', 'right'] as const) {
      const sideScore = average(scored.filter((r) => r.side === side).map((r) => r.score));
      if (sideScore !== null) sides[side] = sideScore;
    }
    tests[test.id] = { score, sides };
    areaScores.set(test.area, [...(areaScores.get(test.area) ?? []), score]);
  }
  const areas = Object.fromEntries(
    SCORE_AREAS.map(({ id }) => [id, average(areaScores.get(id) ?? [])])
  ) as AreaScores;
  const scoredAreas = Object.values(areas).filter((v) => v !== null);
  return { areas, tests, overall: average(scoredAreas) };
}

/**
 * Change from `previous` to `current` in score points (percent of the 0–100 scale), from the
 * rounded scores so it matches the numbers shown. `null` if either is missing.
 */
export function scoreChange(current: number | null, previous: number | null | undefined) {
  if (current === null || previous === null || previous === undefined) return null;
  return Math.round(current) - Math.round(previous);
}

/** "+12%", "−8%" or "0%". */
export function formatScoreChange(change: number) {
  return `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)}%`;
}

/** Colors from a score of 0 (red) through yellow to 100 (green), for gradients and interpolation. */
export const SCORE_COLORS = ['#E5484D', '#F5C518', '#30A46C'] as const;
export const SCORE_COLOR_STOPS = [0, 0.5, 1];
