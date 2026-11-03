/**
 * Release notes the app shows once after it updates, whether the update came from the Play Store or
 * over the air. They ship inside the update itself, so they're always the ones for the code running.
 *
 * To announce features: add an entry at the top with an `id` one higher than the last, then build
 * or publish an update as usual. Releases without anything to announce don't need an entry.
 */
export type Release = {
  /** Only ever goes up. Not the app version, because updates over the air keep that the same. */
  id: number;
  /** Short lines, one per feature or fix, shown as a bulleted list. */
  notes: string[];
};

/** Newest first. */
export const RELEASES: Release[] = [
  {
    id: 1,
    notes: ["See what's new in Plie right here after each update."],
  },
];
