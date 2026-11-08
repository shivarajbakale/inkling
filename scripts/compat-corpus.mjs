#!/usr/bin/env node
// Adds sources to the 1.x compatibility corpus, tests/compat/1.0/. Files that
// are already there are never touched: the corpus only grows. Run it after
// adding examples, then `npx vitest run tests/compat.test.ts` writes the new
// files' parsed Docs.
//
//   node scripts/compat-corpus.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'tests', 'compat', '1.0');
let added = 0;
const add = (name, text) => {
  const file = join(out, `${name}.inkling`);
  if (existsSync(file)) return;
  writeFileSync(file, text.endsWith('\n') ? text : text + '\n');
  added++;
};

for (const dir of ['examples/gallery', 'examples/docs', 'examples/fixtures', 'examples/templates', 'tests/fixtures/big'])
  for (const f of readdirSync(join(root, dir)).filter((x) => x.endsWith('.inkling')).sort())
    add(`${dir.split('/').pop()}--${basename(f, '.inkling')}`, readFileSync(join(root, dir, f), 'utf8'));

// ```inkling fences in the docs people copy from.
for (const md of ['README.md', '.claude/skills/inkling/SKILL.md', 'examples/sites/content/diagrams.md']) {
  const text = readFileSync(join(root, md), 'utf8');
  [...text.matchAll(/^```inkling[^\n]*\n([\s\S]*?)^```/gm)].forEach((m, k) => add(`snippet--${basename(md, '.md').toLowerCase()}-${k + 1}`, m[1]));
}
console.log(`${added} file${added === 1 ? '' : 's'} added to tests/compat/1.0`);
