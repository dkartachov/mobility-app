import { EXERCISES, type Exercise } from '@/data/exercises';

export type WorkoutStep = {
  exercise: Exercise;
  durationSeconds: number;
};

export const DAILY_MINUTES = [8, 15, 22] as const;

/** Countdown before each exercise starts, so you have time to get into position. */
export const BUFFER_SECONDS = 10;

/** 2-minute holds are rarer than 1-minute ones. */
const TWO_MINUTE_CHANCE = 0.25;

function pickRandom<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Fills `minutes` with random exercises, each 1 or 2 minutes long. The same exercise never
 * appears twice in a row (unless the library only has one).
 */
export function buildWorkout(minutes: number): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  let remaining = minutes;

  while (remaining > 0) {
    const previous = steps.at(-1)?.exercise;
    const candidates = EXERCISES.length > 1 ? EXERCISES.filter((e) => e !== previous) : EXERCISES;
    const length = remaining >= 2 && Math.random() < TWO_MINUTE_CHANCE ? 2 : 1;

    steps.push({ exercise: pickRandom(candidates), durationSeconds: length * 60 });
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
