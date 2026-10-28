import { EXERCISES, getExercise, searchExercises } from './exercises';

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
