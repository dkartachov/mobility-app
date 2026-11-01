/**
 * Instructions that only show the first time something comes up, until reset from Settings. This
 * is about this phone's install rather than your data, so it lives in the key-value store and isn't
 * part of backups. To add some, list an id here and call `useFirstTimeInstructions` with it.
 */
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';

const INSTRUCTION_IDS = ['timeout'] as const;
export type InstructionId = (typeof INSTRUCTION_IDS)[number];

function storageKey(id: InstructionId) {
  return `instructions.seen.${id}`;
}

export function resetInstructions() {
  INSTRUCTION_IDS.forEach((id) => Storage.removeItemSync(storageKey(id)));
}

/** Whether to show these instructions. Stays the same until unmounted, so they don't vanish as soon as they're seen. */
export function useFirstTimeInstructions(id: InstructionId) {
  const [show] = useState(() => Storage.getItemSync(storageKey(id)) !== 'true');

  useEffect(() => {
    Storage.setItemSync(storageKey(id), 'true');
  }, [id]);

  return show;
}
