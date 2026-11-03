import Storage from 'expo-sqlite/kv-store';

import { EQUIPMENT, EXERCISE_TYPES, POSITIONS } from '@/data/exercises';

import type * as WorkoutFiltersModule from './workout-filters';

/** Loads the module fresh, the way opening the app does. */
function load() {
  let loaded!: typeof WorkoutFiltersModule;
  jest.isolateModules(() => {
    loaded = jest.requireActual('./workout-filters');
  });
  return loaded;
}

describe('workout filters', () => {
  beforeEach(() => {
    Storage.removeItemSync('workoutFilters');
  });

  it('has everything selected the first time', () => {
    expect(load().getWorkoutFilters()).toEqual({
      positions: [...POSITIONS],
      equipment: [...EQUIPMENT],
      types: [...EXERCISE_TYPES],
    });
  });

  it('remembers the selection, including nothing selected', () => {
    const selection = { positions: ['standing' as const], equipment: [], types: ['passive' as const] };
    load().setWorkoutFilters(selection);

    expect(load().getWorkoutFilters()).toEqual(selection);
  });

  it('updates the current value right away', () => {
    const { getWorkoutFilters, setWorkoutFilters } = load();
    const selection = { positions: [], equipment: ['wall' as const], types: [] };
    setWorkoutFilters(selection);

    expect(getWorkoutFilters()).toBe(selection);
  });

  it('falls back to everything when the saved value is unreadable', () => {
    Storage.setItemSync('workoutFilters', 'not json');

    expect(load().getWorkoutFilters()).toEqual({
      positions: [...POSITIONS],
      equipment: [...EQUIPMENT],
      types: [...EXERCISE_TYPES],
    });
  });

  it('drops saved values that no longer exist', () => {
    Storage.setItemSync(
      'workoutFilters',
      JSON.stringify({ positions: ['standing', 'upside-down'], equipment: ['rope'], types: ['active', 'explosive'] })
    );

    expect(load().getWorkoutFilters()).toEqual({ positions: ['standing'], equipment: [], types: ['active'] });
  });

  it('keeps a selection saved before types existed, with both types', () => {
    Storage.setItemSync('workoutFilters', JSON.stringify({ positions: ['seated'], equipment: ['band'] }));

    expect(load().getWorkoutFilters()).toEqual({
      positions: ['seated'],
      equipment: ['band'],
      types: [...EXERCISE_TYPES],
    });
  });
});
