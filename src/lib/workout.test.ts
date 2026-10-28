import { EXERCISES } from '@/data/exercises';

import { buildWorkout, DAILY_MINUTES, formatClock, type WorkoutStep } from './workout';

function totalMinutes(steps: WorkoutStep[]) {
  return steps.reduce((sum, step) => sum + step.durationSeconds, 0) / 60;
}

/** Groups the two sides of a two-sided exercise into one entry. */
function exercisesInOrder(steps: WorkoutStep[]) {
  return steps.filter((step) => step.side !== 2).map((step) => step.exercise);
}

describe('buildWorkout', () => {
  // Random, so check the guarantees over many runs.
  const RUNS = 200;

  it.each([...DAILY_MINUTES, 1, 2, 60])('fills exactly %i minutes when possible', (minutes) => {
    for (let i = 0; i < RUNS; i++) {
      expect(totalMinutes(buildWorkout(minutes))).toBe(minutes);
    }
  });

  it('uses 1 or 2 minute holds, and 1 minute for one-minute-only exercises', () => {
    for (let i = 0; i < RUNS; i++) {
      for (const step of buildWorkout(22)) {
        expect([60, 120]).toContain(step.durationSeconds);
        if (step.exercise.oneMinuteOnly || step.exercise.twoSided) expect(step.durationSeconds).toBe(60);
      }
    }
  });

  it('splits two-sided exercises into consecutive side 1 and side 2 steps', () => {
    for (let i = 0; i < RUNS; i++) {
      const steps = buildWorkout(22);
      steps.forEach((step, index) => {
        if (!step.exercise.twoSided) {
          expect(step.side).toBeUndefined();
        } else if (step.side === 1) {
          expect(steps[index + 1]).toEqual({ ...step, side: 2 });
        } else {
          expect(steps[index - 1]).toEqual({ ...step, side: 1 });
        }
      });
    }
  });

  it('never repeats an exercise back to back', () => {
    for (let i = 0; i < RUNS; i++) {
      const exercises = exercisesInOrder(buildWorkout(60));
      exercises.slice(1).forEach((exercise, index) => expect(exercise).not.toBe(exercises[index]));
    }
  });

  it("doesn't reuse an exercise until the whole library has been used", () => {
    for (let i = 0; i < RUNS; i++) {
      // Only the final one-minute top-up may reach back into used exercises early.
      const exercises = exercisesInOrder(buildWorkout(60));
      const firstRound = exercises.slice(0, Math.min(EXERCISES.length, exercises.length - 1));
      expect(new Set(firstRound).size).toBe(firstRound.length);
    }
  });

  it('returns no steps for 0 minutes', () => {
    expect(buildWorkout(0)).toEqual([]);
  });
});

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [60, '1:00'],
    [125, '2:05'],
    [600, '10:00'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });
});
