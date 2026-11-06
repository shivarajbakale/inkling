import createMDX from '@next/mdx';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const withMDX = createMDX({
  options: {
    // A path, not a function, so Turbopack can pass it to the MDX loader.
    // vendor/ is copied in by `node ../prepare.mjs` (the same as `npm run vendor`).
    remarkPlugins: [[`${here}/vendor/inkling/inkling-remark.js`, { strict: true }]],
  },
});

export default withMDX({
  pageExtensions: ['js', 'jsx', 'md', 'mdx'],
  // This fixture lives inside the Inkling repo; build it on its own.
  turbopack: { root: here },
});
