// markdown-it fixture.
//   node examples/sites/markdown-it/build.mjs     writes dist/client.html and dist/svg.html
// Uses the built plugin from dist-lib/, as a site would. The test suite calls
// `build()` with the plugin from src/ instead.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import MarkdownIt from 'markdown-it';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
export const content = join(here, '..', 'content', 'diagrams.md');

/** Builds the page body in one mode. */
export function build(inklingMarkdownIt, mode) {
  const md = new MarkdownIt().use(inklingMarkdownIt, { mode, strict: true, hydrate: mode === 'svg', injectScript: 'inkling.iife.js' });
  return md.render(readFileSync(content, 'utf8'), { path: 'content/diagrams.md' });
}

const page = (title, body) =>
  `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>\n<body>\n${body}\n</body>\n</html>\n`;

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { default: inklingMarkdownIt } = await import(pathToFileURL(join(root, 'dist-lib', 'inkling-markdown-it.js')).href);
  const out = join(here, 'dist');
  mkdirSync(out, { recursive: true });
  cpSync(join(root, 'dist-lib', 'inkling.iife.js'), join(out, 'inkling.iife.js'));
  for (const mode of ['client', 'svg']) {
    writeFileSync(join(out, `${mode}.html`), page(`markdown-it, ${mode} mode`, build(inklingMarkdownIt, mode)));
    console.log(`markdown-it: wrote ${join(out, `${mode}.html`)}`);
  }
}
