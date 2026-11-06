// Copies the built library into another project:
//   npm run vendor -- ../my-app/src/vendor
// creates ../my-app/src/vendor/inkling/ with inkling.js, inkling.iife.js,
// the type declarations and a VERSION file naming the commit it came from.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const dest = process.argv[2];
if (!dest) {
  console.error('Usage: npm run vendor -- <folder in your other project>');
  process.exit(1);
}
if (!existsSync('dist-lib/inkling.js')) {
  console.error('No build found. Run `npm run build:lib` first.');
  process.exit(1);
}
const out = resolve(dest, 'inkling');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['inkling.js', 'inkling.iife.js', 'inkling.js.map', 'inkling.iife.js.map']) cpSync(join('dist-lib', f), join(out, f));
cpSync('dist-lib/types', join(out, 'types'), { recursive: true });
// One-line declaration so `import ... from './vendor/inkling/inkling.js'` is typed.
writeFileSync(join(out, 'inkling.d.ts'), "export * from './types/lib';\n");
let commit = 'uncommitted';
try {
  commit = execSync('git rev-parse --short HEAD').toString().trim();
  if (execSync('git status --porcelain').toString().trim()) commit += '+changes';
} catch {}
writeFileSync(join(out, 'VERSION'), `inkling 0.1.0 (${commit})\n`);
console.log(`Copied Inkling ${commit} to ${out}`);
