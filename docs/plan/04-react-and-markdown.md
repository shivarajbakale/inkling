# Workstream 4 — React wrapper and Markdown plugin

Goal: drop Inkling into React apps and into docs written in Markdown, using the
same no-npm distribution as the core (`dist-lib/` committed, consumed by copying
it in, a git dependency or a script tag).

Needs the stable API from workstream 1 (v0.3.0). The build-time Markdown mode also
needs the font metrics from v0.2.0.

## Files added to `dist-lib/`

| File | What it is | Dependencies |
| --- | --- | --- |
| `inkling-react.js` + types | React component and hook | `react` (peer, not bundled) |
| `inkling-remark.js` + types | remark plugin for MDX, Astro, Docusaurus, Next and unified pipelines | none at runtime in client mode; `linkedom` in svg mode |
| `inkling-markdown-it.js` + types | markdown-it plugin for VitePress and other markdown-it setups | same |
| `inkling-node.js` + types | `renderToSVG(source)` for Node, used by both plugins and the CLI | `linkedom` (bundled) |
| `bin/inkling.mjs` | Command line: `render`, `check`, `format` | uses `inkling-node.js` |

`package.json` `exports` gains `./react`, `./remark`, `./markdown-it` and `./node`,
so a git-dependency install can import `inkling/react` and the others.

## R1. React wrapper (about 3 days)

The wrapper uses the core directly rather than wrapping the web component, so props
are typed, events are real callbacks and server rendering is safe.

```tsx
import { Inkling, useInkling, type InklingHandle } from 'inkling/react';

<Inkling
  source={source}
  paper="napkin"            // any setting overrides the source, as attributes do
  autoplay                  // draw on first view
  controls                  // built-in play bar; false for none
  step={step}               // controlled step (optional)
  onStepChange={setStep}
  onReady={(diagram) => {}}
  onDiagnostics={(list) => {}}
  className="my-diagram"
/>

const ref = useRef<InklingHandle>(null);
ref.current?.play();
ref.current?.next();
ref.current?.toSVG();
```

- `useInkling(source, options)` returns `{ ref, diagram, diagnostics, player }` for
  people who want to build their own controls.
- **Server rendering:** on the server it renders an empty box with the right
  aspect ratio (from the layout, which needs no DOM since workstream 1) so the page
  does not jump. The drawing appears on the client. If `ssrSvg` is passed, from
  `renderToSVG` at build time, it renders that markup and then takes over.
- **Strict Mode:** effects are idempotent. A test mounts, unmounts and remounts.
- **Next.js:** the file starts with `'use client'`.
- **Controls:** the built-in play bar is unstyled apart from CSS variables
  (`--inkling-accent` and others), so host apps can theme it.
- **Build:** a second Vite library entry with `react`, `react-dom` and
  `react/jsx-runtime` marked external.
- **Tests:** React Testing Library for rendering, props, controlled step, error
  callbacks and Strict Mode. One Next.js app router fixture checks server rendering
  in CI.
- The playground's `Sketch` component is replaced by this wrapper, so the app uses
  its own public API.

## R2. Markdown plugins (about 4 days)

Authors write a fenced block:

````md
```inkling paper=chalkboard autoplay height=320
title "Photosynthesis"
sun ~> leaf
```
````

Options in the fence's info string: any setting (`paper`, `pen`, `hand`, `mess`,
`seed`, `layout`), plus `autoplay`, `controls=none`, `height`, `alt="…"` and
`mode=client|svg`.

Two output modes, chosen per site in the plugin options and overridable per fence.

**Client mode (default):** the fence becomes
`<inkling-diagram …>source</inkling-diagram>`, with the source escaped.

- The page must load `inkling.iife.js` once. The plugin can add the script tag
  (`injectScript: '/static/inkling.iife.js'`) or leave it to the site.
- Animation and steps work. Needs JavaScript.

**SVG mode:** the fence is rendered at build time with `renderToSVG` and inlined as
`<figure class="inkling">` holding the SVG and a `<figcaption>` from the title.

- No JavaScript is needed on the page. Works with RSS, email and strict pages.
- Fonts: either embedded in each SVG (`embedFonts: true`, trimmed to the characters
  used) or one shared stylesheet the site loads.
- `hydrate: true` adds `data-inkling-source`, so if the script is present the static
  drawing upgrades to an animated one in place.
- Build errors: by default an error box is rendered in place of the drawing and a
  warning is logged. `strict: true` fails the build instead, for CI.

**Integration recipes,** each with a tiny fixture site in `examples/sites/` checked
in CI:

- Astro: `remarkPlugins: [inkling()]`
- Docusaurus: `remarkPlugins` in the preset config
- Next.js with MDX: `@next/mdx` options
- VitePress: `markdown.config: (md) => md.use(inklingMarkdownIt)`
- Plain unified: remark, then remark-rehype, then rehype-stringify

**Tests:**

- Unit tests: info-string parsing, escaping (sources containing `</inkling-diagram>`,
  `<script>` and quotes), both modes, and error handling.
- The SVG mode output for each fixture matches the browser render's golden. This
  proves the Node renderer and font metrics agree with the browser.

## R3. Command line (about 2 days)

Built on `inkling-node.js`; run with Node, with no install beyond cloning or
vendoring.

```sh
node bin/inkling.mjs render diagram.inkling -o diagram.svg [--paper napkin] [--embed-fonts]
node bin/inkling.mjs render docs/**/*.inkling          # writes .svg next to each
node bin/inkling.mjs check diagram.inkling             # diagnostics; exit 1 on errors
node bin/inkling.mjs format diagram.inkling --write
```

- Useful for GitHub READMEs: commit the `.svg` next to the source and reference it
  as an image, with no render server needed.
- A sample GitHub Action re-renders the changed `.inkling` files on pull requests.

**Done when (v0.7.0):**

- the React wrapper powers the playground;
- the five integration fixture sites build in CI in both modes;
- Node SVG output matches the browser goldens;
- the README documents all three entry points.
