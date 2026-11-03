#!/usr/bin/env node
/**
 * Runs before publishing a build or update: shows the newest release notes in release-notes.json,
 * which the app shows once after it updates, and waits for Enter. Ctrl+C stops so you can edit them.
 * Without a terminal to ask in, as on CI, it only shows them.
 */
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createInterface } = require('node:readline');

const FILE = join(__dirname, '..', 'release-notes.json');

function fail(message) {
  console.error(`\nrelease-notes.json: ${message}\n`);
  process.exit(1);
}

let releases;
try {
  releases = JSON.parse(readFileSync(FILE, 'utf8'));
} catch (error) {
  fail(`couldn't read it (${error.message})`);
}

if (!Array.isArray(releases) || releases.length === 0) fail('should be a list of releases, newest first.');
for (const release of releases) {
  const valid =
    Number.isInteger(release?.id) &&
    Array.isArray(release.notes) &&
    release.notes.length > 0 &&
    release.notes.every((note) => typeof note === 'string' && note.trim() !== '');
  if (!valid) fail(`each release needs a whole-number "id" and a list of "notes": ${JSON.stringify(release)}`);
}
const ids = releases.map(({ id }) => id);
if (new Set(ids).size !== ids.length) fail('two releases share an id.');

const latest = releases.reduce((a, b) => (b.id > a.id ? b : a));
if (releases[0] !== latest) fail(`the newest release (id ${latest.id}) should be first.`);

console.log(`\nWhat's new (release ${latest.id}), shown once to anyone who hasn't seen it:\n`);
latest.notes.forEach((note) => console.log(`  • ${note}`));
console.log(
  `\nAlready announced? Add a release with "id": ${latest.id + 1} at the top of release-notes.json,` +
    `\nor carry on to publish without new notes.\n`
);

if (!process.stdin.isTTY) process.exit(0);

const prompt = createInterface({ input: process.stdin, output: process.stdout });
prompt.on('SIGINT', () => {
  console.log('\nStopped. Edit release-notes.json, then run this again.');
  process.exit(130);
});
prompt.question('Press Enter to continue, or Ctrl+C to edit them first. ', () => {
  prompt.close();
});
