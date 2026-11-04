import type { Equipment, Exercise, ExerciseType, Position } from '@/data/exercises';

/**
 * What the library is narrowed to. Unlike the daily workout's filters, nothing selected shows
 * everything, and selecting narrows: any match within a group, every group with a selection.
 */
export type LibraryFilters = {
  positions: Position[];
  equipment: Equipment[];
  types: ExerciseType[];
};

export const NO_LIBRARY_FILTERS: LibraryFilters = { positions: [], equipment: [], types: [] };

export function hasLibraryFilters({ positions, equipment, types }: LibraryFilters) {
  return positions.length + equipment.length + types.length > 0;
}

/** Selects `value` in `group`, or unselects it if it already was. */
export function toggleLibraryFilter(filters: LibraryFilters, group: keyof LibraryFilters, value: string): LibraryFilters {
  const values: readonly string[] = filters[group];
  const next = values.includes(value) ? values.filter((other) => other !== value) : [...values, value];
  return { ...filters, [group]: next };
}

/** Exercises that work either way, standing or seated, match either position. */
export function filterLibrary(exercises: readonly Exercise[], { positions, equipment, types }: LibraryFilters) {
  return exercises.filter(
    (exercise) =>
      (positions.length === 0 || exercise.position === 'either' || positions.includes(exercise.position)) &&
      (equipment.length === 0 || equipment.some((needed) => exercise.equipment?.includes(needed))) &&
      (types.length === 0 || types.includes(exercise.active ? 'active' : 'passive'))
  );
}
