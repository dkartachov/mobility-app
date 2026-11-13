import { EXERCISES, getExercises, WIND_DOWN_EXERCISE_IDS, type Exercise } from '@/data/exercises';
import type { ScoreArea } from '@/data/mobility-score';
import { FLEXIBILITY_TESTS } from '@/data/mobility-tests';

import type { WorkoutFilters } from './workout-filters';

/** One timed hold. Two-sided exercises become two consecutive steps, one per side. */
export type WorkoutStep = {
  exercise: Exercise;
  durationSeconds: number;
  /** Set for two-sided exercises. */
  side?: 1 | 2;
};

export const DAILY_MINUTES = [8, 15, 22] as const;

/** Countdown before each exercise (and before switching sides), so you have time to get into position. */
export const BUFFER_SECONDS = 10;

/** Dev-only fast mode, so a whole workout can be clicked through in seconds. */
export const FAST_BUFFER_SECONDS = 1;
export const FAST_STEP_SECONDS = 5;
/** How long a timeout lasts with the short timeouts dev switch on, whatever length is set in Settings. */
export const SHORT_TIMEOUT_SECONDS = 5;

/** 2-minute holds are rarer than 1-minute ones. */
const TWO_MINUTE_CHANCE = 0.25;

export function pickRandom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

/** The exercises that fit the selected positions and types, and can be done with the selected equipment. */
export function filterExercises({ positions, equipment, types }: WorkoutFilters) {
  return EXERCISES.filter((exercise) => {
    const positionFits =
      exercise.position === 'either' ? positions.length > 0 : positions.includes(exercise.position);
    const typeFits = types.includes(exercise.active ? 'active' : 'passive');
    return positionFits && typeFits && (exercise.equipment ?? []).every((needed) => equipment.includes(needed));
  });
}

/**
 * Fills `minutes` with random exercises from `library`, each 1 or 2 minutes long (always 1 for
 * exercises marked `oneMinuteOnly`). Two-sided exercises always take 2 minutes: 1 minute per side.
 * No exercise repeats until the whole library has been used, and the same exercise never appears
 * twice in a row (unless the library only has one).
 */
export function buildWorkout(minutes: number, library: readonly Exercise[] = EXERCISES): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  let unused = [...library];
  let remaining = minutes;

  while (remaining > 0) {
    const previous = steps.at(-1)?.exercise;
    if (unused.length === 0) unused = [...library];
    const notPrevious = (pool: readonly Exercise[]) => (pool.length > 1 ? pool.filter((e) => e !== previous) : [...pool]);
    let candidates = notPrevious(unused);
    if (remaining < 2) {
      // Prefer an unused one-minute exercise, then a reused one, rather than overshooting the time.
      const oneMinute = candidates.filter((e) => !e.twoSided);
      const anyOneMinute = notPrevious(library).filter((e) => !e.twoSided);
      if (oneMinute.length > 0) candidates = oneMinute;
      else if (anyOneMinute.length > 0) candidates = anyOneMinute;
    }
    const exercise = pickRandom(candidates);
    unused = unused.filter((e) => e !== exercise);

    if (exercise.twoSided) {
      steps.push({ exercise, durationSeconds: 60, side: 1 }, { exercise, durationSeconds: 60, side: 2 });
      remaining -= 2;
      continue;
    }

    const length = remaining >= 2 && !exercise.oneMinuteOnly && Math.random() < TWO_MINUTE_CHANCE ? 2 : 1;
    steps.push({ exercise, durationSeconds: length * 60 });
    remaining -= length;
  }

  return steps;
}

/** The exercises wind-down workouts pick from: only easy passive stretches and gentle mobility drills. */
export const WIND_DOWN_EXERCISES = getExercises(WIND_DOWN_EXERCISE_IDS);

/** A low intensity workout for after training, from `WIND_DOWN_EXERCISES`. */
export function buildWindDownWorkout(minutes: number): WorkoutStep[] {
  return buildWorkout(minutes, WIND_DOWN_EXERCISES);
}

/** Share of a focus workout's minutes given to exercises for other areas, for variety. */
export const FOCUS_VARIETY_SHARE = 0.2;

/** Share of each focus area's minutes given to exercises for its weakest movement. */
export const FOCUS_MOVEMENT_SHARE = 0.5;

/**
 * A workout mostly made of exercises for `areas`: each area gets an even share of the time (the
 * first, lowest scoring, any minute left over), avoiding exercises another area already picked.
 * Within an area, about `FOCUS_MOVEMENT_SHARE` of its time, and always at least one exercise, goes
 * to exercises that train its test in `tests` (its weakest movement), when there are any.
 * About `FOCUS_VARIETY_SHARE` of the workout goes to exercises for none of the areas. Then it's all
 * shuffled together.
 */
export function buildFocusWorkout(
  minutes: number,
  areas: readonly ScoreArea[],
  tests: readonly string[] = [],
  library: readonly Exercise[] = EXERCISES
): WorkoutStep[] {
  if (areas.length === 0) return buildWorkout(minutes, library);
  let focusMinutes = minutes - Math.round(minutes * FOCUS_VARIETY_SHARE);
  const used = new Set<Exercise>();
  const parts: WorkoutStep[][] = [];
  /** Adds a part of about `partMinutes` and returns how long it came to: a minute over when only two-sided exercises were left for an odd minute. */
  const build = (partMinutes: number, pool: readonly Exercise[]) => {
    const steps = buildWorkout(partMinutes, pool);
    steps.forEach((step) => used.add(step.exercise));
    parts.push(steps);
    return steps.reduce((sum, step) => sum + step.durationSeconds, 0) / 60;
  };
  let builtMinutes = 0;
  areas.forEach((area, i) => {
    const share = Math.ceil(focusMinutes / (areas.length - i));
    const forArea = library.filter((e) => e.areas.includes(area));
    const unused = () => forArea.filter((e) => !used.has(e));

    const areaTests = FLEXIBILITY_TESTS.filter((test) => test.area === area && tests.includes(test.id));
    const forMovement = unused().filter((e) => areaTests.some((test) => e.trains?.includes(test.id)));
    let areaMinutes = 0;
    if (forMovement.length && share > 0) areaMinutes += build(Math.ceil(share * FOCUS_MOVEMENT_SHARE), forMovement);
    if (share > areaMinutes) {
      const rest = unused();
      areaMinutes += build(share - areaMinutes, rest.length ? rest : forArea.length ? forArea : library);
    }
    // A part that ran over takes its extra minute from the parts after it, keeping the total exact.
    focusMinutes -= areaMinutes;
    builtMinutes += areaMinutes;
  });
  const others = library.filter((e) => !e.areas.some((area) => areas.includes(area)));
  if (minutes > builtMinutes) parts.push(buildWorkout(minutes - builtMinutes, others.length ? others : library));
  return shuffleExercises(parts.flat());
}

/**
 * Shuffles the exercises in `steps`, keeping both sides of a two-sided exercise together and, where
 * a few tries find a way, the same exercise from appearing twice in a row.
 */
function shuffleExercises(steps: WorkoutStep[]) {
  const groups = steps.reduce<WorkoutStep[][]>((all, step) => {
    if (step.side === 2) all.at(-1)!.push(step);
    else all.push([step]);
    return all;
  }, []);
  let shuffled = groups;
  for (let attempt = 0; attempt < 20; attempt++) {
    shuffled = [...groups];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (shuffled.every((group, i) => i === 0 || group[0].exercise !== shuffled[i - 1][0].exercise)) break;
  }
  return shuffled.flat();
}

/** Formats seconds as `m:ss`. */
export function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
