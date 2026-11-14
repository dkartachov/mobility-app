/**
 * Instructions that only show the first time something comes up, until reset from Settings. This
 * is about this phone's install rather than your data, so it lives in the key-value store and isn't
 * part of backups. To add some, list an id here and call `useFirstTimeInstructions` or
 * `useInstructionsUntilDone` with it.
 */
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';

const INSTRUCTION_IDS = ['timeout', 'swipe-instructions'] as const;
export type InstructionId = (typeof INSTRUCTION_IDS)[number];

function storageKey(id: InstructionId) {
  return `instructions.seen.${id}`;
}

function isSeen(id: InstructionId) {
  return Storage.getItemSync(storageKey(id)) === 'true';
}

export function resetInstructions() {
  INSTRUCTION_IDS.forEach((id) => Storage.removeItemSync(storageKey(id)));
}

/** Whether to show these instructions. Stays the same until unmounted, so they don't vanish as soon as they're seen. */
export function useFirstTimeInstructions(id: InstructionId) {
  const [show] = useState(() => !isSeen(id));

  useEffect(() => {
    Storage.setItemSync(storageKey(id), 'true');
  }, [id]);

  return show;
}

/**
 * For instructions that teach something the user has to do, like a swipe: they keep showing, every
 * time they come up, until `done` is called because the user actually did it. Just having them on
 * screen doesn't count, since they might never have been noticed. Without an id there's nothing to show.
 */
export function useInstructionsUntilDone(id: InstructionId | undefined) {
  const [show, setShow] = useState(() => id !== undefined && !isSeen(id));

  const done = () => {
    if (!show || id === undefined) return;
    Storage.setItemSync(storageKey(id), 'true');
    setShow(false);
  };

  return { show, done };
}
