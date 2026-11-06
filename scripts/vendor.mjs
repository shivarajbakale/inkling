// Copies the built library into another project:
//   npm run vendor -- ../my-app/src/vendor
// creates ../my-app/src/vendor/inkling/ with every dist-lib build (core, React,
// remark, markdown-it, Node), their type declarations, the command line in
// bin/, and a VERSION file naming the commit it came from.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lib = join(root, 'dist-lib');
const dest = process.argv[2];
if (!dest) {
  console.error('Usage: npm run vendor -- <folder in your other project>');
  process.exit(1);
}
if (!existsSync(join(lib, 'inkling.js'))) {
  console.error('No build found. Run `npm run build:lib` first.');
  process.exit(1);
}
const out = resolve(dest, 'inkling');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const FILES = [
  'inkling.js', 'inkling.iife.js', 'inkling.js.map', 'inkling.iife.js.map',
  'inkling-react.js', 'inkling-react.js.map', 'inkling-react.d.ts',
  'inkling-node.js', 'inkling-node.d.ts',
  'inkling-remark.js', 'inkling-remark.d.ts',
  'inkling-markdown-it.js', 'inkling-markdown-it.d.ts',
];
for (const f of FILES) if (existsSync(join(lib, f))) cpSync(join(lib, f), join(out, f));
cpSync(join(lib, 'types'), join(out, 'types'), { recursive: true });
// The builds are ES modules; say so, so Node loads them without guessing.
writeFileSync(join(out, 'package.json'), '{ "type": "module", "private": true }\n');
// One-line declaration so `import ... from './vendor/inkling/inkling.js'` is typed.
writeFileSync(join(out, 'inkling.d.ts'), "export * from './types/lib';\n");
// The command line finds inkling-node.js one folder up: node vendor/inkling/bin/inkling.mjs
mkdirSync(join(out, 'bin'));
cpSync(join(root, 'bin', 'inkling.mjs'), join(out, 'bin', 'inkling.mjs'));

let commit = 'uncommitted';
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  if (execSync('git status --porcelain', { cwd: root }).toString().trim()) commit += '+changes';
} catch {}
writeFileSync(join(out, 'VERSION'), `inkling ${JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version} (${commit})\n`);
console.log(`Copied Inkling ${commit} to ${out}`);
