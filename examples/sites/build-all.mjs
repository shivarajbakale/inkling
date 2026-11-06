// Builds the plain fixture sites (unified and markdown-it) with the built
// plugins from dist-lib/. `npm run sites`. The framework sites (astro,
// vitepress, docusaurus, next) each have their own package.json:
//   cd examples/sites/<name> && npm install && npm run build
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
let failed = false;
for (const site of ['unified', 'markdown-it']) {
  const r = spawnSync(process.execPath, [join(here, site, 'build.mjs')], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`${site}: build failed`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
