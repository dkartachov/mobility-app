/**
 * Works out every 3D clip in `src/data/exercise-animations-3d.ts` and writes them to
 * `src/data/exercise-animations-3d.json`, which is what the app ships: solving the poses on the
 * phone took seconds at every launch. Run it after adding or changing a clip:
 *
 *   node scripts/build-clips.mjs
 *
 * `rig3d.test.ts` fails while the JSON is out of date. Needs Node 22.18 or newer, which runs
 * TypeScript directly.
 */
import { writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'src/data/exercise-animations-3d.json');

// As in `render-exercise-photo.mjs`: teaches Node the app's `@/` imports, and that its TypeScript
// is ES modules.
const src = pathToFileURL(join(ROOT, 'src') + '/').href;
const hooks = `export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) return next(new URL(specifier.slice(2) + '.ts', ${JSON.stringify(src)}).href, context);
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.startsWith(${JSON.stringify(src)}) && url.endsWith('.ts')) return next(url, { ...context, format: 'module-typescript' });
  return next(url, context);
}`;
register(`data:text/javascript,${encodeURIComponent(hooks)}`);

const started = performance.now();
const clips = await import(pathToFileURL(join(ROOT, 'src/data/exercise-animations-3d.ts')).href);
const { clipsToJson } = await import(pathToFileURL(join(ROOT, 'src/lib/clip-json.ts')).href);
const json = clipsToJson(clips);
writeFileSync(OUTPUT, json);

const count = json.split('\n').length - 3;
console.log(`Wrote ${count} clips (${Math.round(json.length / 1024)} KB) in ${Math.round(performance.now() - started)} ms.`);
