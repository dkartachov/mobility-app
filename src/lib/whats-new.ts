/**
 * Which release notes this phone hasn't shown yet. This is about this install rather than your data,
 * so it lives in the key-value store and isn't part of backups.
 */
import Storage from 'expo-sqlite/kv-store';

import { RELEASES, type Release } from '@/data/whats-new';

const LAST_SEEN_KEY = 'whatsNew.lastSeen';

function latestId(releases: Release[]) {
  return Math.max(0, ...releases.map(({ id }) => id));
}

/**
 * Notes from every release newer than the last one shown, newest first. A phone that has never shown
 * any, because it's coming from a version without this, gets only the latest release's.
 */
export function getUnseenNotes(releases: Release[] = RELEASES) {
  const stored = Storage.getItemSync(LAST_SEEN_KEY);
  const lastSeen = stored === null ? latestId(releases) - 1 : Number(stored);
  return releases
    .filter(({ id }) => id > lastSeen)
    .sort((a, b) => b.id - a.id)
    .flatMap(({ notes }) => notes);
}

export function markWhatsNewSeen(releases: Release[] = RELEASES) {
  Storage.setItemSync(LAST_SEEN_KEY, String(latestId(releases)));
}
