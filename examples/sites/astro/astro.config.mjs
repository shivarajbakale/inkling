import { defineConfig } from 'astro/config';
// Copied in by `node ../prepare.mjs` (the same as `npm run vendor`).
import remarkInkling from './vendor/inkling/inkling-remark.js';

export default defineConfig({
  markdown: {
    remarkPlugins: [[remarkInkling, { strict: true, injectScript: '/inkling.iife.js' }]],
  },
});
