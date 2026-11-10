import {
  EQUIPMENT,
  EXERCISE_TYPES,
  EXERCISES,
  POSITIONS,
  type Equipment,
  type ExerciseType,
  type Position,
} from '@/data/exercises';
import { FLEXIBILITY_TESTS } from '@/data/mobility-tests';

import {
  buildFocusWorkout,
  buildWorkout,
  DAILY_MINUTES,
  filterExercises,
  formatClock,
  type WorkoutStep,
} from './workout';

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
  const ids = (positions: Position[], equipment: Equipment[], types: ExerciseType[] = [...EXERCISE_TYPES]) =>
    filterExercises({ positions, equipment, types }).map((e) => e.id);

  it('includes everything when everything is selected', () => {
    expect(filterExercises({ positions: [...POSITIONS], equipment: [...EQUIPMENT], types: [...EXERCISE_TYPES] })).toEqual(
      EXERCISES
    );
  });

  it('keeps only exercises of the selected type', () => {
    const everything = { positions: [...POSITIONS], equipment: [...EQUIPMENT] };

    const active = filterExercises({ ...everything, types: ['active'] });
    expect(active.length).toBeGreaterThan(0);
    expect(active.every((e) => e.active)).toBe(true);

    const passive = filterExercises({ ...everything, types: ['passive'] });
    expect(passive.length).toBeGreaterThan(0);
    expect(passive.every((e) => !e.active)).toBe(true);

    expect(active.length + passive.length).toBe(EXERCISES.length);
  });

  it('is empty when no type is selected', () => {
    expect(ids([...POSITIONS], [...EQUIPMENT], [])).toEqual([]);
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

  // The narrowest selections the daily screen allows: one position, one type and no equipment.
  it.each(
    POSITIONS.flatMap((position) => EXERCISE_TYPES.map((type) => [position, type] as const))
  )('fills every daily length with only %s, %s and no equipment', (position, type) => {
    const library = filterExercises({ positions: [position], equipment: [], types: [type] });
    for (const minutes of DAILY_MINUTES) {
      for (let i = 0; i < 200; i++) {
        expect(totalMinutes(buildWorkout(minutes, library))).toBe(minutes);
      }
    }
  });
});

describe('buildFocusWorkout', () => {
  const RUNS = 200;
  const AREAS = ['hips', 'shoulders'] as const;
  const targets = (step: WorkoutStep) => step.exercise.areas.some((area) => (AREAS as readonly string[]).includes(area));

  it.each(DAILY_MINUTES)('fills exactly %i minutes', (minutes) => {
    for (let i = 0; i < RUNS; i++) expect(totalMinutes(buildFocusWorkout(minutes, AREAS))).toBe(minutes);
  });

  it.each(DAILY_MINUTES)('spends most of %i minutes on the focus areas, and some on others', (minutes) => {
    for (let i = 0; i < RUNS; i++) {
      const steps = buildFocusWorkout(minutes, AREAS);
      const focusMinutes = totalMinutes(steps.filter(targets));
      expect(focusMinutes).toBeGreaterThanOrEqual(minutes * 0.75);
      expect(focusMinutes).toBeLessThan(minutes);
    }
  });

  it('gives both areas time', () => {
    for (let i = 0; i < RUNS; i++) {
      const steps = buildFocusWorkout(15, ['ankles', 'shoulders']);
      for (const area of ['ankles', 'shoulders'] as const) {
        expect(steps.some((step) => step.exercise.areas.includes(area))).toBe(true);
      }
    }
  });

  it('keeps both sides of two-sided exercises together', () => {
    for (let i = 0; i < RUNS; i++) {
      const steps = buildFocusWorkout(22, AREAS);
      steps.forEach((step, index) => {
        if (step.side === 1) expect(steps[index + 1]).toEqual({ ...step, side: 2 });
        if (step.side === 2) expect(steps[index - 1]).toEqual({ ...step, side: 1 });
      });
    }
  });

  it('never repeats an exercise back to back', () => {
    for (let i = 0; i < RUNS; i++) {
      const exercises = exercisesInOrder(buildFocusWorkout(22, AREAS));
      exercises.slice(1).forEach((exercise, index) => expect(exercise).not.toBe(exercises[index]));
    }
  });

  describe('with the weakest test in each area', () => {
    const TESTS = ['hip-internal-rotation', 'shoulder-external-rotation'];
    const trains = (test: string) => (step: WorkoutStep) => !!step.exercise.trains?.includes(test);

    it.each(DAILY_MINUTES)('always has exercises for each of them in %i minutes', (minutes) => {
      for (let i = 0; i < RUNS; i++) {
        const steps = buildFocusWorkout(minutes, AREAS, TESTS);
        for (const test of TESTS) expect(steps.some(trains(test))).toBe(true);
      }
    });

    it.each(DAILY_MINUTES)('still fills exactly %i minutes, mostly on the focus areas', (minutes) => {
      for (let i = 0; i < RUNS; i++) {
        const steps = buildFocusWorkout(minutes, AREAS, TESTS);
        expect(totalMinutes(steps)).toBe(minutes);
        expect(totalMinutes(steps.filter(targets))).toBeGreaterThanOrEqual(minutes * 0.75);
      }
    });

    it('leaves time for the rest of each area', () => {
      for (let i = 0; i < RUNS; i++) {
        const steps = buildFocusWorkout(22, AREAS, TESTS);
        expect(steps.some((step) => targets(step) && !TESTS.some((test) => trains(test)(step)))).toBe(true);
      }
    });

    it.each(FLEXIBILITY_TESTS.map((test) => [test.id, test.area] as const))(
      'fills the time exactly when %s is the weakest',
      (test, area) => {
        for (const minutes of DAILY_MINUTES) {
          for (let i = 0; i < 50; i++) {
            const steps = buildFocusWorkout(minutes, [area], [test]);
            expect(totalMinutes(steps)).toBe(minutes);
            expect(steps.some(trains(test))).toBe(true);
          }
        }
      }
    );

    it('falls back to the area when nothing trains the test', () => {
      const library = EXERCISES.map((exercise) => ({ ...exercise, trains: undefined }));
      const steps = buildFocusWorkout(15, AREAS, TESTS, library);
      expect(totalMinutes(steps)).toBe(15);
      expect(totalMinutes(steps.filter(targets))).toBeGreaterThanOrEqual(15 * 0.75);
    });
  });

  it('is a plain workout without focus areas', () => {
    expect(totalMinutes(buildFocusWorkout(8, []))).toBe(8);
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
