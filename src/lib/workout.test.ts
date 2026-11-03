import { EQUIPMENT, EXERCISES, POSITIONS, type Equipment, type Position } from '@/data/exercises';

import { buildWorkout, DAILY_MINUTES, filterExercises, formatClock, type WorkoutStep } from './workout';

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

  it('only picks from the given library', () => {
    const library = EXERCISES.slice(0, 5);
    for (let i = 0; i < RUNS; i++) {
      for (const step of buildWorkout(22, library)) expect(library).toContain(step.exercise);
    }
  });
});

describe('filterExercises', () => {
  const ids = (positions: Position[], equipment: Equipment[]) => filterExercises({ positions, equipment }).map((e) => e.id);

  it('includes everything when everything is selected', () => {
    expect(filterExercises({ positions: [...POSITIONS], equipment: [...EQUIPMENT] })).toEqual(EXERCISES);
  });

  it('keeps only exercises done without a mat, including squats and kneeling, and those that can be done either way', () => {
    const standing = ids(['standing'], [...EQUIPMENT]);

    expect(standing).toEqual(expect.arrayContaining(['standing-forward-fold', 'bottom-squat', 'knight-stretch']));
    expect(standing).toContain('neck-side-stretch');
    expect(standing).not.toContain('seated-pike-stretch');
    expect(standing).not.toContain('happy-baby');
    expect(standing).not.toContain('cat-cow');
  });

  it('keeps only exercises done on a mat, and those that can be done either way', () => {
    const seated = ids(['seated'], [...EQUIPMENT]);

    expect(seated).toEqual(expect.arrayContaining(['seated-pike-stretch', 'happy-baby', 'blackburn', 'cat-cow']));
    expect(seated).toContain('neck-side-stretch');
    expect(seated).not.toContain('standing-forward-fold');
    expect(seated).not.toContain('knight-stretch');
  });

  it('leaves out exercises needing equipment that is not selected', () => {
    const noWall = ids([...POSITIONS], ['band']);
    expect(noWall).not.toContain('couch-stretch');
    expect(noWall).not.toContain('leg-swings');
    expect(noWall).toContain('shoulder-pass-throughs');

    const noBand = ids([...POSITIONS], ['wall']);
    expect(noBand).not.toContain('shoulder-pass-throughs');
    expect(noBand).not.toContain('lying-hamstring-stretch');
    expect(noBand).toContain('couch-stretch');
  });

  it('is empty when no position is selected', () => {
    expect(ids([], [...EQUIPMENT])).toEqual([]);
  });

  // The narrowest selections the daily screen allows: one position and no equipment.
  it.each(POSITIONS)('fills every daily length with only %s and no equipment', (position) => {
    const library = filterExercises({ positions: [position], equipment: [] });
    for (const minutes of DAILY_MINUTES) {
      for (let i = 0; i < 200; i++) {
        expect(totalMinutes(buildWorkout(minutes, library))).toBe(minutes);
      }
    }
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
