/**
 * The mobility score is broken down by movement area rather than by body part, since several
 * areas (overhead reach, the posterior chain) span more than one joint.
 */

import { FLEXIBILITY_TESTS, METHOD_UNITS, type TestScoring, type Unit } from './mobility-tests';

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

export type MobilityScore = {
  areas: AreaScores;
  /** The average of the areas that have a score, `null` when none do. */
  overall: number | null;
};

/** One saved test result, as stored with a flexibility test. */
export type ScoredResult = { exerciseId: string; value: number; unit: Unit };

const average = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

/** A result's score, 0–100. */
export function scoreResult(value: number, { zeroAt, fullAt }: TestScoring) {
  return Math.min(100, Math.max(0, ((value - zeroAt) / (fullAt - zeroAt)) * 100));
}

/**
 * Scores one flexibility test's results. Each test scores the average of its sides, and each
 * area the average of its tests. Results in another unit than the test's (from before it was
 * measured this way) are left out.
 */
export function mobilityScore(results: ScoredResult[]): MobilityScore {
  const testScores = new Map<string, number[]>();
  for (const test of FLEXIBILITY_TESTS) {
    const values = results
      .filter((r) => r.exerciseId === test.id && r.unit === METHOD_UNITS[test.method.kind])
      .map((r) => r.value);
    const value = average(values);
    if (value === null) continue;
    testScores.set(test.area, [...(testScores.get(test.area) ?? []), scoreResult(value, test.scoring)]);
  }
  const areas = Object.fromEntries(
    SCORE_AREAS.map(({ id }) => [id, average(testScores.get(id) ?? [])])
  ) as AreaScores;
  const scored = Object.values(areas).filter((v) => v !== null);
  return { areas, overall: average(scored) };
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
