# Inkling

Write a diagram as text, get a drawing that looks hand-made — and can draw itself step by step.

```
title "Request, then response"
paper notebook
browser: box "Browser"
server: round "Server"
browser -> server : "GET /"
server --> browser : "200 OK"
circle server
```

- **Playground app:** `npm install && npm run dev`, then open http://localhost:5173
- **Language reference:** the Syntax page in the playground, or `src/app/pages.tsx`
- **Roadmap:** [PLAN.md](PLAN.md)

## Using Inkling in another product

Inkling is not on the npm registry. The built library lives in `dist-lib/` and is
committed, so every commit and tag is a ready-to-use release.

| File | Use it for |
| --- | --- |
| `dist-lib/inkling.iife.js` | A classic `<script>` tag. Defines `window.Inkling` and `<inkling-diagram>`. |
| `dist-lib/inkling.js` | ES module for apps with a bundler (Vite, webpack, Next). |
| `dist-lib/types/` | TypeScript declarations. |

Both builds are self-contained (rough.js and dagre are bundled) and have no
framework dependency. About 36 KB gzipped.

### Option 1: copy it in (simplest)

From this repo:

```sh
npm run build:lib
npm run vendor -- ../your-app/src/vendor
```

This creates `../your-app/src/vendor/inkling/` with both builds, types and a
`VERSION` file naming the commit. Then in your app:

```ts
import { drawInto } from './vendor/inkling/inkling.js';

await drawInto(document.getElementById('diagram')!, source, { paper: 'napkin', animate: true });
```

Re-run `npm run vendor` to update.

### Option 2: a plain `<script>` tag

Serve `inkling.iife.js` from your own static files:

```html
<script src="/static/inkling.iife.js"></script>

<inkling-diagram autoplay>
  a -> b : "hello"
</inkling-diagram>
```

Once this repo is on GitHub, jsDelivr can serve it straight from a tag, with no npm:

```html
<script src="https://cdn.jsdelivr.net/gh/<owner>/inkling@v0.1.0/dist-lib/inkling.iife.js"></script>
```

### Option 3: git dependency

`package.json` points at `dist-lib/`, so a package manager can install straight
from git (still no registry):

```sh
npm install git+ssh://git@github.com/<owner>/inkling.git#v0.1.0
# or, before it is on GitHub:
npm install ../inkling
```

```ts
import { drawInto } from 'inkling';
```

### Option 4: git submodule

```sh
git submodule add <repo-url> vendor/inkling
```

Then import `vendor/inkling/dist-lib/inkling.js`.

## The `<inkling-diagram>` element

```html
<inkling-diagram autoplay paper="chalkboard" pen="chalk" mess="0.6" seed="3" theme="dark">
  …source…
</inkling-diagram>
```

| Attribute | Meaning |
| --- | --- |
| `autoplay` | Draw itself when it scrolls into view. Ignored with reduced motion. |
| `controls="none"` | Hide the play bar. |
| `paper`, `pen`, `hand`, `mess`, `seed` | Override the matching line in the source. |
| `theme="light" \| "dark"` | Colour of the play bar. Defaults to the system setting. |
| `source="…"` | Source as an attribute instead of inner text. |

From script: `el.code = 'a -> b'` redraws it.

## The JavaScript API

```ts
import { drawInto, mount, parse, Player, setFontSource } from 'inkling';

// Draw, waiting for the handwriting fonts first.
const diagram = await drawInto(container, source, { paper: 'graph' });

diagram.steps;      // [{ index, caption, start, end }]
diagram.seek(1.2);  // show the drawing 1.2 s into its animation
diagram.toSVG();    // finished drawing as an SVG string

// Play controls
const player = new Player(diagram, (p) => console.log(p.t, p.stepIndex));
player.play();  player.next();  player.prev();  player.pause();

// Check source without drawing it
parse(source).diagnostics; // [{ code, severity, message, hint, fix, span }], see docs/errors.md

// Positions without ink, and a check for overlaps
checkScene(layout(parse(source))); // [] when nothing overlaps
```

`mount()` is the same as `drawInto()` without waiting for fonts. Use it when your
page already loads them.

### Rendering outside a browser

`render()` takes a `document` option, so it works in Node with a DOM shim such as
linkedom. Text is measured from built-in font metrics, so no canvas is needed.

```ts
import { parseHTML } from 'linkedom';
import { render } from 'inkling';

const { document } = parseHTML('<!doctype html><html><body></body></html>');
const { drawing } = render(source, {}, { document, idPrefix: 'd1' });
const svg = drawing.svg.outerHTML;
```

### Fonts

The handwriting fonts come from Google Fonts. Inkling adds the stylesheet link
itself the first time it draws. To self-host them (for a strict Content Security
Policy, or offline), call this before drawing:

```ts
setFontSource('/static/fonts/inkling-hands.css'); // your own @font-face file
setFontSource(null);                              // your page already loads them
```

The families are Caveat, Kalam, Patrick Hand, Gochi Hand and Architects
Daughter, all under the SIL Open Font License.

## Project layout

```
src/core/        the renderer, no framework
  syntax/        tokenizer and parser (source positions, diagnostics)
  layouts/       one file per layout; each returns a Scene
  humanise.ts    jitter and tilt, then arrow routing
  draw/          ink: paper, text, nodes, arrows, marks, schedule
  metrics.generated.ts   font widths, made by `npm run metrics`
src/embed/       the <inkling-diagram> web component
src/lib.ts       library entry point (what dist-lib is built from)
src/app/         the playground (React + Mantine)
examples/        standalone.html: the library in a page with no build step
scripts/         vendor.mjs (copy into other projects), artifact.mjs
tests/           unit, golden SVG, invariant, fuzz, Node and speed tests
tests/golden/    reference drawings; `npm run test:update` rewrites them
dist-lib/        built library, committed
```

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Playground with hot reload |
| `npm run build:lib` | Rebuild `dist-lib/` (both builds and types) |
| `npm run vendor -- <dir>` | Copy the library into another project |
| `npm run build:single` | Playground as one HTML file in `dist-single/` |
| `npm test` | All tests |
| `npm run test:update` | Accept intended drawing changes (review the SVG diff) |
| `npm run check` | Type-check, test and build the library: run before every release |
| `npm run metrics` | Re-measure the fonts (needs Playwright) |
| `npm run typecheck` | Type-check everything |
