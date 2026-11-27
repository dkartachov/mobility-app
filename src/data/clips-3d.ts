import type { Clip3D } from '@/lib/rig3d';

/** The clips module itself, for its export names only: importing it would solve every clip at launch. */
type ClipSource = typeof import('./exercise-animations-3d');
export type ClipName3D = { [K in keyof ClipSource]: ClipSource[K] extends Clip3D ? K : never }[keyof ClipSource];

/**
 * Every 3D clip, already worked out by `scripts/build-clips.mjs` (see `src/lib/clip-json.ts`).
 * Write clips in `exercise-animations-3d.ts`, run the script, and take them from here.
 */
// A `require` so TypeScript doesn't work out a type for the whole file; the names are checked above.
export const CLIPS_3D: Record<ClipName3D, Clip3D> = require('./exercise-animations-3d.json');
