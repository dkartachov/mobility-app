/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP_DIR = join(__dirname, 'app');

/** Every screen the root stack can show: top-level route files, groups and folders. */
function rootRoutes() {
  const routes = new Set<string>();
  for (const entry of readdirSync(APP_DIR, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !/\.tsx$/.test(entry.name) || /\.test\./.test(entry.name)) continue;
    const path = relative(APP_DIR, join(entry.parentPath, entry.name)).replace(/\.tsx$/, '');
    if (path === '_layout') continue;
    const [first] = path.split('/');
    // A group is one screen with its own layout; other folders hold their routes directly.
    routes.add(first.startsWith('(') ? first : path);
  }
  return [...routes];
}

describe('root layout', () => {
  // Expo Router shows unlisted routes to everyone, so one missing here skips the login screen.
  it('lists every route behind a guard', () => {
    const layout = readFileSync(join(APP_DIR, '_layout.tsx'), 'utf8');
    expect(rootRoutes()).toEqual(expect.arrayContaining(['(tabs)', 'login', 'settings', 'exercise/[id]']));
    const missing = rootRoutes().filter((route) => !layout.includes(`<Stack.Screen name="${route}"`));
    expect(missing).toEqual([]);
  });
});
