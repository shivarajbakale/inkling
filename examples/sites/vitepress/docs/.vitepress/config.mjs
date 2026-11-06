import { defineConfig } from 'vitepress';
// Copied in by `node ../prepare.mjs` (the same as `npm run vendor`).
import inklingMarkdownIt from '../../vendor/inkling/inkling-markdown-it.js';

export default defineConfig({
  title: 'Inkling fixture',
  // Vue drops <script> and <style> from page templates, so the script and the
  // fonts are loaded here instead of by the plugin.
  head: [
    ['script', { src: '/inkling.iife.js' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Kalam:wght@400;700&family=Patrick+Hand&family=Gochi+Hand&family=Architects+Daughter&display=swap' }],
  ],
  markdown: {
    config: (md) => md.use(inklingMarkdownIt, { strict: true, vue: true, fontCss: null }),
  },
  vue: {
    template: { compilerOptions: { isCustomElement: (tag) => tag === 'inkling-diagram' } },
  },
});
