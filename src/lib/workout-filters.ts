/**
 * Which exercises daily workouts can pick from. This is about this phone rather than your data, so
 * it lives in the key-value store and isn't part of backups.
 */
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { EQUIPMENT, POSITIONS, type Equipment, type Position } from '@/data/exercises';

export type WorkoutFilters = {
  positions: Position[];
  equipment: Equipment[];
};

const STORAGE_KEY = 'workoutFilters';

function readStoredFilters(): WorkoutFilters {
  try {
    const stored = JSON.parse(Storage.getItemSync(STORAGE_KEY) ?? 'null');
    return {
      positions: POSITIONS.filter((position) => stored.positions.includes(position)),
      equipment: EQUIPMENT.filter((equipment) => stored.equipment.includes(equipment)),
    };
  } catch {
    // Never saved, or unreadable: everything is selected.
    return { positions: [...POSITIONS], equipment: [...EQUIPMENT] };
  }
}

let current = readStoredFilters();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWorkoutFilters() {
  return current;
}

export function setWorkoutFilters(filters: WorkoutFilters) {
  Storage.setItemSync(STORAGE_KEY, JSON.stringify(filters));
  current = filters;
  listeners.forEach((listener) => listener());
}

export function useWorkoutFilters() {
  return useSyncExternalStore(subscribe, getWorkoutFilters);
}
