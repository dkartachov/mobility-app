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
export type TestScore = {
  score: number;
  error: number;
  sides: Partial<Record<Side, number>>;
  /** The measurements behind the score, as taken, in the test's unit. */
  results: { side: Side | null; value: number; unit: Unit }[];
};

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

/** How many areas focus workouts target. */
export const FOCUS_AREA_COUNT = 2;

/**
 * The lowest scoring areas, lowest first, which focus workouts target. Areas without a score are
 * left out, and ties go to the area listed first in `SCORE_AREAS`.
 */
export function focusAreas(areas: AreaScores, count = FOCUS_AREA_COUNT): ScoreArea[] {
  return SCORE_AREAS.filter(({ id }) => areas[id] !== null)
    .sort((a, b) => areas[a.id]! - areas[b.id]!)
    .slice(0, count)
    .map(({ id }) => id);
}

export function scoreAreaLabel(area: ScoreArea) {
  return SCORE_AREAS.find(({ id }) => id === area)!.label;
}

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

/** The result a percentile of a standard normal distribution falls at, by bisection on `normalCdf`. */
export function normalQuantile(p: number) {
  let low = -10;
  let high = 10;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (normalCdf(mid) < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/**
 * The results each band covers for someone of `demographics`, in the test's units, lowest band
 * first. Every test scores higher results better, so each band runs from its lower edge up to the
 * next band's. The bottom and top bands are open-ended.
 */
export function bandRanges(test: FlexibilityTest, demographics: Demographics): { band: ScoreBand; min: number; max: number }[] {
  const { mean, sd } = normAt(test.norm, demographics);
  const valueAt = (score: number) => mean + sd * normalQuantile(score / 100);
  const ascending = [...SCORE_BANDS].reverse();
  return ascending.map(([from, band], i) => ({
    band,
    min: i === 0 ? -Infinity : valueAt(from),
    max: i === ascending.length - 1 ? Infinity : valueAt(ascending[i + 1][0]),
  }));
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
    const measured = results.filter((r) => r.exerciseId === test.id && r.unit === METHOD_UNITS[test.method.kind]);
    const scored = measured.map((r) => ({
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
    const testScore: TestScore = {
      score,
      error: averageError(scored.map((r) => r.error))!,
      sides,
      results: measured.map(({ side, value, unit }) => ({ side, value, unit })),
    };
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
  /** The biggest change, in score points, that measurement error alone explains 95% of the time. */
  noise: number;
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
  return { points: Math.round(current) - Math.round(previous), real: Math.abs(current - previous) > noise, noise };
}

/** Why a change that isn't real is shown as no real change, for an info dialog. */
export function explainNoRealChange({ points, noise }: ScoreChange) {
  const moved =
    points === 0
      ? "Your score didn't change"
      : `Your score went ${points > 0 ? 'up' : 'down'} ${Math.abs(points)} ${Math.abs(points) === 1 ? 'point' : 'points'}`;
  return {
    title: 'Why no real change?',
    message:
      `${moved}, but no measurement is exact. The same person measures a little differently from one day to the next, from how warm they are, the time of day or where the phone sits.\n\n` +
      `With your results, measuring alone could move your score by up to ${Math.max(1, Math.round(noise))} points, so a smaller change can't be told apart from that. Bigger changes show in points.\n\n` +
      'Testing the same way each time, at the same time of day, keeps this as small as it can be.',
  };
}

/** How the score is worked out, for the score info screen. Keep in step with the scoring above. */
export const SCORE_EXPLANATION: { heading: string; paragraphs: string[] }[] = [
  {
    heading: 'Each test',
    paragraphs: [
      'Every result is compared with healthy adults of your sex and age, and scored by the share of them you match or beat. 50 is average, and 84 means you reach further than about 84% of people.',
      "Your sex and age come from your profile. Without them, you're compared with men and women together, and with the youngest adults.",
      'Tests done on both sides score each side on its own, then take the average.',
    ],
  },
  {
    heading: 'Each area',
    paragraphs: [
      'Shoulders, hips, hamstrings and ankles each score the average of the tests that stretch them.',
    ],
  },
  {
    heading: 'Overall',
    paragraphs: [
      'Your overall score is the average of the areas you have a score for, so each area counts the same however many tests it has.',
      'It averages percentiles rather than being one, so it gets harder to raise the closer you get to 100: scoring 84 in every area is rarer than 84% of people.',
    ],
  },
  {
    heading: 'What the numbers mean',
    paragraphs: [
      SCORE_BANDS.map(([from, band], i) => `${SCORE_BAND_LABELS[band]}: ${from}–${i === 0 ? 100 : SCORE_BANDS[i - 1][0]}`).join(
        '\n'
      ),
      'The middle half of adults are average, and the top and bottom 10% are well above and well below.',
    ],
  },
  {
    heading: 'Changes between tests',
    paragraphs: [
      'No measurement is exact. How warm you are, the time of day or where the phone sits all move a result a little, even when your flexibility is the same.',
      'So a change only shows in points when it is bigger than measuring alone would explain. Smaller ones show as no real change. Testing the same way, at the same time of day, keeps that margin small.',
    ],
  },
];

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
