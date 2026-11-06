# Workstream 1 — Make the core solid

Goal: the renderer behaves well on anything people type, is covered by tests,
and has the internal shape the new layouts, the playground editor and the
build-time Markdown renderer all need.

Two parts. Part A (`v0.2.0`) is restructuring with no visible change. Part B
(`v0.3.0`) adds language features and layout quality.

---

## Part A — Foundations (about 1.5 weeks)

### A1. Font metrics instead of canvas measuring

Today `measure()` in `src/core/layout.ts` uses a canvas, so layout depends on the
browser and needs the fonts loaded first. Replace it with metrics tables.

- `scripts/font-metrics.mjs` opens each hand font in Playwright and records, per
  font and weight:
  - the advance width of every character in Basic Latin, Latin-1 and common
    punctuation, at 100 px;
  - ascent, descent and a fallback width for anything missing.
- Output: `src/core/metrics/<hand>.json`, committed. About 3 KB each.
- `measure(text, px, hand)` becomes a pure function: sum of advances × px / 100.
- Characters missing from the table (CJK, emoji) fall back to canvas measuring
  when a canvas exists, else to the fallback width.

Why: layout becomes deterministic in tests and in Node, and the first drawing no
longer waits for fonts to load before it can be laid out.

### A2. A scene model between layout and drawing

Today `layout.ts` returns dagre-specific data and `draw.ts` (807 lines) mixes
geometry, styling and animation. Introduce one shared intermediate form.

```ts
// src/core/scene.ts
interface Scene {
  width: number;
  height: number;
  nodes: SceneNode[];        // positioned, sized, rotated
  edges: SceneEdge[];        // polyline points, kind, arrowheads, label
  decorations: Decoration[]; // lifelines, axes, frames, dividers, braces, headers
  labels: PlacedLabel[];     // filled in by the label placement pass
}
```

Pipeline:

```
source ─► tokenize ─► parse ─► Doc ─► layout[doc.layout] ─► Scene
       ─► humanise(scene, mess, seed) ─► placeLabels(scene) ─► draw(scene) ─► SVG + timeline
```

- Every layout (workstream 2) is a function `(doc, measure) => Scene` registered
  in `src/core/layouts/index.ts`. The current dagre code moves to
  `layouts/flow.ts` unchanged in behaviour.
- `humanise` takes per-layout limits, so a sequence diagram can keep lifelines
  straight while boxes still tilt.
- Split `draw.ts` into `draw/text.ts`, `draw/paper.ts`, `draw/shapes.ts`,
  `draw/edges.ts`, `draw/marks.ts` (annotations), `draw/decorations.ts`,
  `draw/schedule.ts` (step timing).

### A3. New tokenizer and parser with source positions

Replace the regex parser in `src/core/parse.ts`.

**Decision: hand-written tokenizer plus recursive-descent parser, not Lezer.**
The language is line-based, so a small tokenizer gives us the best error
messages. The same tokenizer drives editor highlighting through CodeMirror's
`StreamLanguage`, so there is still one source of truth for the syntax. Lezer
would add a grammar build step and make friendly error messages harder.

Tokenizer (`src/core/syntax/tokens.ts`): `IDENT`, `STRING`, `NUMBER`, `ARROW`
(`->` `-->` `~>` `<->` `<~>`), `COLON`, `COMMA`, `EQUALS`, `AT` (`@3`), `BULLET`
(`-` at line start), `LBRACE`, `RBRACE`, `KEYWORD`, `COMMENT`, `NEWLINE`,
`INDENT`. Every token carries `{ line, from, to }`.

Grammar, informally:

```
file        := line*
line        := INDENT? statement? COMMENT? NEWLINE
statement   := setting | node | edges | mark | step | group | bullet | layoutLine
setting     := ('title' STRING) | (SETTING_KEY value)
id          := IDENT | STRING                      # STRING ids allow spaces
node        := id ':' SHAPE? STRING? attr*
edges       := id (ARROW id)+ (':' label)? attr*
mark        := MARK_KIND target STRING? COLOR? AT?
target      := id | id ARROW id                    # marks can target an arrow
step        := 'step' NUMBER ':'? (id (',' id)*)? STRING?
group       := 'group' id STRING? '{' NEWLINE line* '}'
bullet      := BULLET text ('as' IDENT)?           # outline items, see workstream 2
attr        := COLOR | KEY '=' value | 'at' NUMBER ',' NUMBER | RELATIVE id
```

Output changes:

- Every node, edge, mark and step keeps a `span` (`line`, `from`, `to`). The
  playground uses it for click-to-edit, hover and error underlines.
- Statements keep their order (`order` index). Sequence diagrams need it.
- One bad line never stops the rest. The parser skips to the next line and records
  a diagnostic.

Diagnostics replace `ParseError`:

```ts
interface Diagnostic {
  code: string;                 // 'E-UNKNOWN-SHAPE'
  severity: 'error' | 'warning';
  message: string;              // 'No shape called "rectangel".'
  hint?: string;                // 'Did you mean "rect"?'
  span: Span;
}
```

- "Did you mean" suggestions use edit distance against the known shapes, papers,
  pens, hands, colours and the node ids defined in the file.
- Warnings (drawing still fine): a step naming an unknown id, a note longer than
  120 characters, an unused node in sequence mode.
- Catalogue every code in `docs/errors.md`. One test per code.

### A4. Tests and checks

- Vitest with jsdom for unit and golden tests. Vitest browser mode with Playwright
  for anything that needs real SVG geometry.
- Move the gallery examples into `examples/*.inkling` files, imported by the app
  with `?raw` and used as test fixtures.
- Test kinds:
  - **Tokenizer and parser:** a table of source lines to expected tokens and AST,
    plus one test per diagnostic code.
  - **Golden SVG:** each fixture is rendered with its seed and compared to
    `tests/golden/<name>.svg`. `npm run test:update` rewrites goldens after an
    intended change. The diff is reviewed like code.
  - **Scene invariants:** for every fixture, no two node boxes overlap, no label
    overlaps a node or another label, and everything sits inside the canvas.
    Implemented as `checkScene(scene)`, which the playground also shows as a debug
    overlay.
  - **Fuzz:** fast-check builds random graphs (0–80 nodes, random edges and marks)
    and asserts render never throws and the invariants hold.
  - **Visual:** Playwright screenshots of the gallery compared with a small pixel
    threshold. These run in CI only.
- `npm run check` runs type-check, lint, unit tests and the library build.

**Done when (v0.2.0):** all five examples render identically to v0.1.0 (golden
diff reviewed), every diagnostic code has a test, and render works in Node with
linkedom.

---

## Part B — Language and quality (about 1.5 weeks)

### B1. Language additions

| Feature | Syntax | Notes |
| --- | --- | --- |
| Ids with spaces | `"Load balancer" -> api` | A quoted id with no node line becomes a box labelled with the id |
| Attributes | `api: box "API" color=red pen=marker size=large` | `size` small/normal/large scales the shape and the label |
| Groups | `group backend "Backend" {` … `}` | Dashed hand-drawn frame with a label tab. Flow layout: dagre compound nodes. Groups can nest one level |
| Marks on arrows | `circle api -> db`, `note api -> db "slow hop"` | Target the arrow's midpoint |
| Icons | `api: icon server "API"` | 30 hand-drawn icons as path data: person, server, database, cloud, phone, laptop, lock, key, mail, file, folder, gear, chart, globe, clock, bell, cart, card, chat, search, star, heart, bolt, bug, rocket, book, camera, code, link, check |
| Auto steps | `steps auto` | Each node, with its incoming arrows, becomes its own step in source order |
| Version line | `inkling 1` (optional, first line) | Lets future breaking changes stay compatible |

Old forms keep working: `layout right` and `layout down` still mean the flow
layout with that direction.

### B2. One label placement pass for everything

Today edge labels and notes are placed one at a time as they are drawn. Replace
this with `placeLabels(scene)`, run once after layout and humanising:

- Gather every label that can move: edge labels, notes, timeline event text,
  sequence notes.
- For each, generate 8–12 candidate positions (sides and along-the-line offsets).
- Score each candidate by overlap with node boxes, line segments, other labels and
  the canvas edge, plus a small penalty for distance from the ideal spot.
- Place the most constrained labels first (fewest good candidates), then the rest
  greedily. Two passes are enough.
- Grow the canvas when a label has to sit outside it.

Also in flow layout:

- **Routing check:** if an arrow segment crosses a node that is not its own end,
  bend it around the node's nearest corner.
- **Wide graphs:** above 7 ranks left to right, suggest `direction down` with a
  warning.

### B3. Accessibility

- Generate a plain-language description from the scene and put it in the SVG's
  `<desc>`. Example: "You → Browser: types example.com. Browser → Resolver: where
  is it?". It is exported in `toSVG()` too.
- The web component and React wrapper render the description as a visually hidden
  list.
- Play controls get keyboard support: space plays and pauses; left and right step
  back and forward.
- Reduced motion stays honoured everywhere.

### B4. Robustness and performance

- `render()` never throws. Internal failures become an `E-INTERNAL` diagnostic
  and the last good drawing stays on screen in the playground.
- Limits: 300 nodes, 600 arrows, 20,000 source characters. Above these the file
  is drawn without animation and a warning is shown.
- Benchmark test: 60 nodes and 90 arrows render in under 150 ms in CI's Chrome.
- The library stays under 60 KB gzipped with the icons and metrics included.

**Done when (v0.3.0):**

- every new feature has tests, a golden and a Syntax page row;
- the fuzz test passes 1,000 runs;
- the label invariant holds on all fixtures;
- the benchmark passes.
