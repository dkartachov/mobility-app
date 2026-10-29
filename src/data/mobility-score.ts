/**
 * The mobility score is broken down by movement area rather than by body part, since several
 * areas (overhead reach, the posterior chain) span more than one joint.
 */

import { FLEXIBILITY_TESTS, METHOD_UNITS, type Side, type TestScoring, type Unit } from './mobility-tests';

export type ScoreArea = 'shoulders' | 'overhead' | 'thorax' | 'hips' | 'postChain' | 'ankles';

export const SCORE_AREAS: { id: ScoreArea; label: string }[] = [
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'overhead', label: 'Overhead' },
  { id: 'thorax', label: 'Thorax' },
  { id: 'hips', label: 'Hips' },
  { id: 'postChain', label: 'Postchain' },
  { id: 'ankles', label: 'Ankles' },
];

/** 0–100 for each area, `null` for an area with no results. */
export type AreaScores = Record<ScoreArea, number | null>;

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

/** A result's score, 0–100. */
export function scoreResult(value: number, { zeroAt, fullAt }: TestScoring) {
  return Math.min(100, Math.max(0, ((value - zeroAt) / (fullAt - zeroAt)) * 100));
}

/**
 * Scores one flexibility test's results. Each side is scored on its own, each test scores the
 * average of its sides, and each area the average of its tests. Results in another unit than
 * the test's are left out.
 */
export function mobilityScore(results: ScoredResult[]): MobilityScore {
  const tests: Partial<Record<string, TestScore>> = {};
  const areaScores = new Map<ScoreArea, number[]>();
  for (const test of FLEXIBILITY_TESTS) {
    const scored = results
      .filter((r) => r.exerciseId === test.id && r.unit === METHOD_UNITS[test.method.kind])
      .map((r) => ({ side: r.side, score: scoreResult(r.value, test.scoring) }));
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
