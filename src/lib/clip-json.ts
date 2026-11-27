/**
 * The 3D clips as the app ships them. Working out a clip's poses runs the solver hundreds of
 * thousands of times across the library, which took seconds at every launch, so the clips are
 * worked out ahead of time by `scripts/build-clips.mjs` and the app reads the result,
 * `src/data/exercise-animations-3d.json`. `rig3d.test.ts` fails if that file is out of date.
 *
 * No imports, so the script can load it on its own.
 */

/** Ten-thousandths of a unit: far finer than a pixel, and it drops the float noise from the file. */
const PLACES = 1e4;

function rounded(key: string, value: unknown): unknown {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`"${key}" is ${value}, which JSON can't hold.`);
    // `+ 0` turns -0 into 0, which JSON writes the same anyway but tests compare apart.
    return Math.round(value * PLACES) / PLACES + 0;
  }
  if (typeof value === 'function') throw new Error(`"${key}" is a function, which JSON can't hold.`);
  return value;
}

/**
 * Every 3D clip exported by the clips module, as JSON: one clip a line so a diff shows which
 * clips changed. Anything else the module exports is left out.
 */
export function clipsToJson(clips: Record<string, unknown>): string {
  const lines = Object.keys(clips)
    .filter((name) => (clips[name] as { view?: unknown } | null)?.view === '3d')
    .sort()
    .map((name) => `${JSON.stringify(name)}:${JSON.stringify(clips[name], rounded)}`);
  return `{\n${lines.join(',\n')}\n}\n`;
}
