// Run from a framework fixture before its build: copies Inkling in, the way
// a real site would (`npm run vendor`), and puts inkling.iife.js where the
// site serves static files.
//   node ../prepare.mjs <static folder>
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const staticDir = resolve(process.argv[2] ?? 'public');
execFileSync(process.execPath, [join(here, '..', '..', 'scripts', 'vendor.mjs'), 'vendor'], { stdio: 'inherit' });
mkdirSync(staticDir, { recursive: true });
cpSync(join('vendor', 'inkling', 'inkling.iife.js'), join(staticDir, 'inkling.iife.js'));
