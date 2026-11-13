import { EXERCISES, getExercise, getExercises, searchExercises, WIND_DOWN_EXERCISE_IDS } from './exercises';
import { SCORE_AREAS } from './mobility-score';
import { FLEXIBILITY_TESTS } from './mobility-tests';

describe('EXERCISES', () => {
  it('has unique ids', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is sorted alphabetically by name', () => {
    const names = EXERCISES.map((e) => e.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })));
  });

  it('has instructions for every exercise', () => {
    for (const exercise of EXERCISES) expect(exercise.instructions.length).toBeGreaterThan(0);
  });

  it('has a photo for every exercise', () => {
    for (const exercise of EXERCISES) expect(exercise.photo).toBeDefined();
  });

  it('has exercises for every score area, enough to fill focus workouts', () => {
    for (const { id } of SCORE_AREAS) {
      expect(EXERCISES.filter((e) => e.areas.includes(id)).length).toBeGreaterThanOrEqual(5);
    }
    expect(EXERCISES.some((e) => e.areas.length === 0)).toBe(true);
  });

  it('only trains flexibility tests that exist, in an area the exercise works', () => {
    for (const exercise of EXERCISES) {
      for (const id of exercise.trains ?? []) {
        const test = FLEXIBILITY_TESTS.find((t) => t.id === id);
        expect(test).toBeDefined();
        expect(exercise.areas).toContain(test!.area);
      }
    }
  });

  it('has exercises that train every flexibility test, so focus workouts can target any of them', () => {
    for (const test of FLEXIBILITY_TESTS) {
      expect(EXERCISES.filter((e) => e.trains?.includes(test.id)).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('has enough one-sided exercises for workouts to fill odd minutes', () => {
    expect(EXERCISES.filter((e) => !e.twoSided).length).toBeGreaterThan(1);
  });
});

describe('getExercise', () => {
  it('finds an exercise by id', () => {
    expect(getExercise('butterfly')?.name).toBe('Butterfly');
  });

  it('returns undefined for unknown or missing ids', () => {
    expect(getExercise('nope')).toBeUndefined();
    expect(getExercise(undefined)).toBeUndefined();
  });
});

describe('getExercises', () => {
  it('keeps the order given and skips unknown ids', () => {
    expect(getExercises(['pancake', 'nope', 'butterfly']).map((e) => e.id)).toEqual(['pancake', 'butterfly']);
  });
});

describe('searchExercises', () => {
  it('returns everything for a blank query', () => {
    expect(searchExercises('   ')).toBe(EXERCISES);
  });

  it('matches names case-insensitively, ignoring surrounding spaces', () => {
    expect(searchExercises('  BUTTER ').map((e) => e.id)).toEqual(['butterfly']);
  });

  it('returns nothing when no name matches', () => {
    expect(searchExercises('zzz')).toEqual([]);
  });
});

describe('WIND_DOWN_EXERCISE_IDS', () => {
  const windDown = getExercises(WIND_DOWN_EXERCISE_IDS);

  it('only lists exercises that exist, once each', () => {
    expect(windDown).toHaveLength(WIND_DOWN_EXERCISE_IDS.length);
    expect(new Set(WIND_DOWN_EXERCISE_IDS).size).toBe(WIND_DOWN_EXERCISE_IDS.length);
  });

  it('is mostly passive stretches, so the routine stays low intensity', () => {
    const passive = windDown.filter((e) => !e.active);
    expect(passive.length / windDown.length).toBeGreaterThanOrEqual(0.75);
  });

  it('needs no equipment', () => {
    for (const exercise of windDown) expect(exercise.equipment ?? []).toEqual([]);
  });

  it('has enough exercises to fill the longest workout without repeats, and one-sided ones for odd minutes', () => {
    expect(windDown.length).toBeGreaterThanOrEqual(22);
    expect(windDown.filter((e) => !e.twoSided).length).toBeGreaterThanOrEqual(3);
  });
});
