import { focusAreas, focusTests } from '@/data/mobility-score';
import { useMobilityScore } from '@/db/mobility-tests';

/**
 * What a focus routine works on, from the latest test: the lowest scoring areas, and the weakest
 * movement in each. Both are empty until a first test, and `score` is null then.
 */
export function useFocusPlan() {
  const score = useMobilityScore();
  const areas = score ? focusAreas(score.areas) : [];
  const tests = score ? focusTests(score.tests, areas) : [];
  return { score, areas, tests };
}
