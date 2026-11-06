// Checks a framework fixture's built HTML: one live <inkling-diagram> (client
// mode) and one inline SVG figure (svg mode), with the escaped source intact.
//   node ../verify.mjs <built html file>
// With --react it checks a page using the React wrapper instead.
import { readFileSync } from 'node:fs';

const [file, ...flags] = process.argv.slice(2);
const html = readFileSync(file, 'utf8');
const problems = [];
const expect = (ok, what) => ok || problems.push(what);

if (flags.includes('--react')) {
  expect(/class="inkling"[^>]*role="group"/.test(html), 'the React wrapper box');
  expect(/aspect-ratio/.test(html), 'the React wrapper reserving space on the server');
  expect(html.includes('React → Server'), 'the React wrapper description list');
  expect(html.includes('inkling-ssr') && /<path[^>]* d="M/.test(html), 'the ssrSvg drawing from renderToSVG');
} else {
  expect(/<inkling-diagram[\s>]/.test(html), 'a client-mode <inkling-diagram>');
  expect(html.includes('client -&gt; mode') || html.includes('client -> mode'), 'the client-mode source as text');
  expect(!html.includes('<script>alert(1)</script>'), 'no unescaped <script> from a source');
  expect(/<figure[^>]*class="inkling"[^>]*>\s*<svg/.test(html), 'an svg-mode <figure class="inkling"><svg>');
  expect(/<path[^>]* d="M/.test(html), 'drawn paths in the SVG');
  expect(html.includes('Built at build time'), 'the svg-mode caption');
}

if (problems.length) {
  console.error(`${file}: missing ${problems.join('; ')}`);
  process.exit(1);
}
console.log(`${file}: ok`);
