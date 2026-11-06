// Copied in by `node ../prepare.mjs` (the same as `npm run vendor`).
import remarkInkling from './vendor/inkling/inkling-remark.js';

/** @type {import('@docusaurus/types').Config} */
export default {
  title: 'Inkling fixture',
  url: 'https://example.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  // MDX renders through React, so the plugin cannot add a <script>: load it here.
  scripts: ['/inkling.iife.js'],
  presets: [
    [
      'classic',
      {
        docs: { routeBasePath: '/', remarkPlugins: [[remarkInkling, { strict: true }]] },
        blog: false,
        pages: false,
      },
    ],
  ],
};
