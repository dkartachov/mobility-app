/**
 * Which release notes this phone hasn't shown yet. This is about this install rather than your data,
 * so it lives in the key-value store and isn't part of backups.
 */
import Storage from 'expo-sqlite/kv-store';

import releaseNotes from '../../release-notes.json';

/**
 * A release with something to announce, from `release-notes.json` at the root of the repo. It ships
 * inside the update itself, so after both Play Store and over-the-air updates the notes are always
 * the ones for the code running. `scripts/confirm-release-notes.js` checks the file before publishing.
 */
export type Release = {
  /** Only ever goes up. Not the app version, because updates over the air keep that the same. */
  id: number;
  /** Short lines, one per feature or fix, shown as a bulleted list. */
  notes: string[];
};

const RELEASES: Release[] = releaseNotes;

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
