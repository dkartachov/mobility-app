// Builds the public privacy policy page from the same text the app shows (src/lib/privacy-policy.ts).
// Run with Node 24+, which imports .ts files directly: node site/build.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

import { CONTACT_EMAIL, DEVELOPER_NAME, POLICY_UPDATED, PRIVACY_POLICY } from '../src/lib/privacy-policy.ts';

const escape = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Link the contact address so it can be tapped.
const format = (text) =>
  escape(text).replaceAll(CONTACT_EMAIL, `<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`);

const sections = PRIVACY_POLICY.map(
  (section) => `
    <section>
      <h2>${escape(section.heading)}</h2>
      ${(section.paragraphs ?? []).map((p) => `<p>${format(p)}</p>`).join('\n      ')}
      ${section.bullets ? `<ul>\n${section.bullets.map((b) => `        <li>${format(b)}</li>`).join('\n')}\n      </ul>` : ''}
    </section>`,
).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Plie privacy policy</title>
  <meta name="description" content="How Plie, the mobility and flexibility training app, handles your data.">
  <style>
    :root { color-scheme: light dark; --bg: #ffffff; --text: #1a1a1a; --muted: #5f6b6a; --accent: #0b6a61; }
    @media (prefers-color-scheme: dark) { :root { --bg: #0f1514; --text: #e8eeed; --muted: #9aa8a6; --accent: #4fc3b6; } }
    body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    main { max-width: 42rem; margin: 0 auto; padding: 2rem 1rem 4rem; }
    h1 { margin: 0 0 0.25rem; }
    h2 { margin: 2rem 0 0.5rem; font-size: 1.1rem; }
    .updated { color: var(--muted); margin: 0; }
    a { color: var(--accent); }
    ul { padding-left: 1.25rem; }
    li { margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <main>
    <h1>Plie privacy policy</h1>
    <p class="updated">Last updated ${escape(POLICY_UPDATED)} &middot; ${escape(DEVELOPER_NAME)}</p>
${sections}
  </main>
</body>
</html>
`;

mkdirSync('site/dist', { recursive: true });
writeFileSync('site/dist/index.html', html);
console.log('Wrote site/dist/index.html');
