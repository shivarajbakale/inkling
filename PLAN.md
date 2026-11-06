# Inkling — build plan

Inkling turns a few lines of text into a diagram that looks drawn by hand, and
can draw itself step by step. This file is the plan for everything after the
prototype. Status as of 2026-11-06.

## Where we are

| Area | State |
| --- | --- |
| Parser (line-based, errors with line numbers) | Working, hand-written regex parser |
| Layout (dagre, left-to-right and top-down) | Working |
| Humaniser (jitter, tilt, per-letter wobble, bowed lines) | Working |
| Sketch pen (rough.js shapes, hatching, highlighter, squiggles) | Working |
| Annotations: circle, underline, strike, highlight, note, check, cross | Working |
| Steps, captions, draw-on player, scrubbing | Working |
| `<inkling-diagram>` web component | Working |
| Library build (`dist-lib/`, ES module + classic script + types) | Working |
| Playground app (Mantine) | Working, plain textarea editor |
| Tests | None yet |

## Principles

- **Text is the source of truth.** Every control writes back to the source.
- **Same text, same drawing.** Everything random is seeded. Snapshot tests rely on it.
- **The core has no framework.** `src/core` needs a DOM and nothing else. React, the
  web component and a future server renderer are thin shells around it.
- **Readable before pretty.** Mess never overlaps labels. When a choice trades
  legibility for character, legibility wins.
- **No npm registry.** Distribution is a git repo plus built files (see README).

---

## Phase 1 — Make the core solid (2–3 weeks)

The prototype works on the examples. This phase makes it work on anything
people type.

1. **Tests first.** Add Vitest with jsdom.
   - Parser: one test per statement type and per error message.
   - Layout: no two node boxes overlap; every label box sits inside the canvas.
   - Golden SVGs: render each example with a fixed seed and compare against a
     checked-in SVG. A deliberate visual change updates the golden file.
2. **Real grammar.** Replace the regex parser with a Lezer grammar. Benefits:
   error recovery (one bad line no longer hides the rest), source positions for
   every token, and the same grammar drives editor highlighting.
3. **Language additions**, each with a test and a Syntax page row:
   - Quoted ids with spaces: `"Load balancer" -> api`.
   - Groups and frames: `group backend "Backend" { api, db }` drawn as a dashed
     hand-drawn border with a label tab.
   - Per-node styling: `api: box "API" pen=marker color=red`.
   - Edge annotations: `circle a->b`, `note a->b "slow hop"`.
   - Icons: `api: icon server "API"` from a small hand-drawn icon set (about 40).
4. **Layout quality.**
   - Label collision pass across all labels and notes at once, not one at a time.
   - Keep arrows off node interiors when routing around obstacles.
   - Limit width: wrap very wide left-to-right graphs onto a second row.
5. **Accessibility.** Generate a text description from the graph ("You → Browser:
   types example.com …") into `<desc>` and an optional visually hidden list.
   Respect reduced motion everywhere, which the prototype already does.
6. **Performance budget.** 60 nodes render in under 150 ms on a mid laptop.
   Measure in a benchmark test.

**Done when:** every example and 30 extra fixture diagrams pass golden tests, a
malformed line never stops the rest from drawing, and Lezer powers both the
parser and the editor.

## Phase 2 — Real handwriting (2–3 weeks)

The biggest jump in realism. Today text is a web font revealed left to right.

1. **Stroke fonts.** Render letters as single-line strokes (Hershey-style or
   Relief SingleLine) so each letter is actually *drawn* during the animation,
   in pen order. Pass the strokes through `perfect-freehand` for pressure.
2. **Glyph alternates.** 3–5 versions of each letter, chosen by seed, so double
   letters never match.
3. **Keep web fonts as a fallback** for scripts the stroke font lacks
   (CJK, Devanagari, Arabic), with the current per-letter jitter.
4. **Your own hand** (stretch, could become its own phase):
   - Print a template sheet, write each letter 3 times, photograph it.
   - Find each cell, skeletonise the ink into centre lines, simplify to strokes.
   - Save as an Inkling hand file (`.inkhand`, JSON of strokes per glyph).
   - `hand ./my-hand.inkhand` in source.

**Done when:** a side-by-side of a real sketch and an Inkling sketch fools most
people in a quick hallway test.

## Phase 3 — More kinds of explanation (3–4 weeks)

Each layout is a separate module behind the same model. `layout <name>` picks it.

| Layout | What it is for | Approach |
| --- | --- | --- |
| `sequence` | Who talks to whom, in order | Lifelines, arrows top to bottom, own algorithm |
| `mindmap` | One idea branching out | Radial tree, organic curved branches |
| `timeline` | Events over time | One hand-drawn axis, alternating labels above and below |
| `compare` | X versus Y | Two columns, matching rows, ticks and crosses |
| `cycle` | Loops such as the habit loop | Nodes on a circle, curved arrows between them |
| `stack` | Layers, such as the OSI model | Stacked boxes with side notes |
| `free` | Full control | `api at 200,120` positions |

Also: **Mermaid import.** Paste Mermaid flowchart or sequence syntax and convert
it to Inkling source, so existing diagrams come over in one step.

**Done when:** each layout has two examples in the gallery and golden tests.

## Phase 4 — Explainer mode (2–3 weeks)

Turns a diagram into a short lesson.

1. **Camera.** Each step can zoom and pan to the part being drawn
   (`step 2: db "…" focus`).
2. **Narration.** Step captions read aloud with the Web Speech API, with drawing
   speed matched to speech length. Option to attach recorded audio per step.
3. **Export.**
   - PNG at 1×/2×/3× (canvas from the finished SVG).
   - GIF and MP4 of the draw-on animation via WebCodecs, with captions burnt in.
   - A slide per step for decks.
4. **Presenter view.** Full-screen with arrow keys for steps.

## Phase 5 — Playground into a product (2–3 weeks)

1. **Editor.** CodeMirror 6 with the Lezer grammar: highlighting, autocomplete for
   node ids, shape names, papers and pens, and inline error underlines.
2. **Click-to-edit.** Click a node in the drawing to select its line in the source.
   Drag a node to pin it (writes `at x,y`).
3. **Saved drawings.** A local library in IndexedDB with names and thumbnails.
4. **Share links.** Source compressed into the URL.
5. **AI drafting.** "Explain OAuth" gives an Inkling first draft. The language is
   small and regular, which suits a model. Ship a Claude skill or MCP tool that
   writes and checks Inkling source with the parser's error messages.

## Phase 6 — Inkling everywhere (2–4 weeks)

All of these wrap the same `dist-lib` build.

| Target | How |
| --- | --- |
| Any web page | `<script src=".../inkling.iife.js">` plus `<inkling-diagram>` (done) |
| Apps with a bundler | Vendored ES module or git dependency (done) |
| React | A 20-line `<Inkling source=… />` wrapper in `src/react.tsx` |
| Markdown docs | remark/rehype plugin turning ```inkling fences into SVG at build time |
| Obsidian | Plugin registering an `inkling` code block processor |
| VS Code | Preview for `.inkling` files plus syntax highlighting |
| READMEs, email, Slack | Render server: `GET /svg/<compressed source>` and `/png/…`, built on the core with a headless DOM (linkedom or happy-dom) and resvg for PNG |
| Notion, Medium | oEmbed endpoint on the same server, plus an iframe page |

Static hosting for the script: GitHub Pages or jsDelivr serving files straight
from a tagged commit of this repo (no npm needed), for example
`https://cdn.jsdelivr.net/gh/<owner>/inkling@v0.2.0/dist-lib/inkling.iife.js`.

---

## Release process (no npm)

1. `npm run build:lib` regenerates `dist-lib/`. It is committed on purpose, so a
   commit or tag is a usable release with no build step for consumers.
2. Bump `version` in `package.json` and `src/lib.ts`.
3. Commit, then tag `vX.Y.Z`.
4. Consumers pick a tag through any of the routes in the README.

Breaking changes to the language bump the minor version until 1.0. After 1.0,
source that parses today must keep parsing.

## Risks and open questions

- **Font licensing.** Caveat, Kalam, Patrick Hand, Gochi Hand and Architects
  Daughter are under the SIL Open Font License, which is fine to bundle. Check any
  stroke font before shipping it.
- **dagre is unmaintained-ish.** If layout limits bite, move to elkjs (heavier,
  better routing) behind the same `layout()` interface.
- **Server rendering needs text measurement without a browser.** Plan: ship font
  metrics as JSON so `measure()` does not need canvas.
- **Bundle size.** The library is about 36 KB gzipped today. Stroke fonts could
  add a lot; load hands lazily, one per drawing.
- **Name.** "Inkling" may clash with existing products. Check before any public
  launch.
