/**
 * Renders a 3D engine clip's still frame as the exercise's library photo: a 960x540 PNG drawn the
 * way `src/components/exercise-figure-3d.tsx` draws it, without the highlight. Run it whenever an
 * exercise moves to the 3D engine, or its clip's still frame or camera changes:
 *
 *   node scripts/render-exercise-photo.mjs CAT_COW_3D assets/images/exercises/cat-cow.png
 *
 * The first argument is the clip's export name in `src/data/exercise-animations-3d.ts`. Needs Node
 * 22.18 or newer, which runs TypeScript directly, and Chrome, Edge or Chromium to turn the drawing
 * into a PNG; set CHROME to its path if it isn't found.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = { width: 960, height: 540 };

/** The same colors and outline as `exercise-figure-3d.tsx`. Change them there and here together. */
const COLORS = {
  background: '#E3EEEC',
  mat: '#D0E6E2',
  near: '#0B776C',
  far: '#7DC4BA',
  shadow: '#0B3B36',
  accent: '#F08A4B',
  strap: '#D9443B',
  scenery: { light: '#C9DDD9', mid: '#B4CFCA', dark: '#A3C2BC' },
};
const OUTLINE = 4.5;

const [clipName, output] = process.argv.slice(2);
if (!clipName || !output) {
  console.error('Usage: node scripts/render-exercise-photo.mjs <CLIP_NAME_3D> <output.png>');
  process.exit(1);
}

// The app imports with `@/` for `src/`, which Node doesn't know, so this teaches it. Its
// TypeScript is all ES modules, which `package.json` can't say without changing the runtime that
// builds match updates against, so this says it too, rather than Node guessing and warning.
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

const rig = await import(pathToFileURL(join(ROOT, 'src/lib/rig3d.ts')).href);
const clips = await import(pathToFileURL(join(ROOT, 'src/data/exercise-animations-3d.ts')).href);
const clip = clips[clipName];
if (!clip || clip.view !== '3d') {
  console.error(`No 3D clip called ${clipName} in src/data/exercise-animations-3d.ts.`);
  process.exit(1);
}

// The still frame is where the clip arrives at that keyframe.
let time = 0;
for (let i = 1; i <= clip.stillFrame; i++) time += clip.keyframes[i].ms;

const stage = rig.stageClip(clip);
// The photo is a plain picture of the pose: the highlight on the parts the exercise works is for
// the animation, so every part is shaded as usual here.
const frame = rig.frameAt({ ...clip, highlight: undefined }, stage.view, time);
let body = `<rect x="-100000" y="-100000" width="200000" height="200000" fill="${COLORS.background}"/>`;
body += `<path d="${stage.mat}" fill="${COLORS.mat}" stroke="${COLORS.mat}" stroke-width="10" stroke-linejoin="round"/>`;
body += `<path d="${frame.shadow}" fill="${COLORS.shadow}" opacity="0.14"/>`;
for (const face of stage.scenery) {
  body += `<path d="${face.d}" fill="${COLORS.scenery[face.tone]}" stroke="${COLORS.scenery[face.tone]}" stroke-width="2" stroke-linejoin="round"/>`;
}
// The trail goes just under the part of the body it traces, as the app draws it.
const trailed = rig.trailedPart(clip.trail);
for (const slot of frame.slots) {
  if (stage.trail && slot.part === trailed) {
    body += `<path d="${stage.trail}" fill="none" stroke="${COLORS.accent}" stroke-width="5" stroke-dasharray="2 12" stroke-linecap="round" opacity="0.8"/>`;
  }
  body += `<path d="${slot.d}" fill="none" stroke="${COLORS.background}" stroke-width="${2 * OUTLINE}" stroke-linejoin="round"/>`;
  body += slot.accent
    ? `<path d="${slot.d}" fill="${COLORS.accent}"/>`
    : `<path d="${slot.d}" fill="${COLORS.far}"/><path d="${slot.d}" fill="${COLORS.near}" fill-opacity="${slot.shade}"/>`;
}
if (frame.strap) {
  body += `<path d="${frame.strap}" fill="none" stroke="${COLORS.strap}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`;
}
const page = `<!doctype html><html><body style="margin:0;background:${COLORS.background}">
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE.width}" height="${SIZE.height}" viewBox="${stage.viewBox}" style="display:block">${body}</svg>
</body></html>`;

const browser =
  process.env.CHROME ??
  [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].find((path) => existsSync(path));
if (!browser) {
  console.error('No Chrome, Edge or Chromium found. Set CHROME to its path.');
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), 'exercise-photo-'));
try {
  const html = join(work, 'photo.html');
  writeFileSync(html, page);
  const target = resolve(output);
  execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--user-data-dir=${join(work, 'profile')}`,
    `--window-size=${SIZE.width},${SIZE.height}`,
    `--screenshot=${target}`,
    pathToFileURL(html).href,
  ], { stdio: 'ignore' });
  if (!existsSync(target)) throw new Error(`The browser didn't write ${target}.`);
  console.log(`Wrote ${output}: ${clipName} at ${time}ms, its still frame.`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
