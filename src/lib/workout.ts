import { EXERCISES, type Exercise } from '@/data/exercises';

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

/** 2-minute holds are rarer than 1-minute ones. */
const TWO_MINUTE_CHANCE = 0.25;

export function pickRandom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Fills `minutes` with random exercises, each 1 or 2 minutes long (always 1 for exercises marked
 * `oneMinuteOnly`). Two-sided exercises always take 2 minutes: 1 minute per side. No exercise
 * repeats until the whole library has been used, and the same exercise never appears twice in a
 * row (unless the library only has one).
 */
export function buildWorkout(minutes: number): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  let unused = [...EXERCISES];
  let remaining = minutes;

  while (remaining > 0) {
    const previous = steps.at(-1)?.exercise;
    if (unused.length === 0) unused = [...EXERCISES];
    const notPrevious = (pool: Exercise[]) => (pool.length > 1 ? pool.filter((e) => e !== previous) : pool);
    let candidates = notPrevious(unused);
    if (remaining < 2) {
      // Prefer an unused one-minute exercise, then a reused one, rather than overshooting the time.
      const oneMinute = candidates.filter((e) => !e.twoSided);
      const anyOneMinute = notPrevious(EXERCISES).filter((e) => !e.twoSided);
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

/** Formats seconds as `m:ss`. */
export function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
