# Inkling — build plan

Inkling turns a few lines of text into a diagram that looks drawn by hand, and
can draw itself step by step. The prototype is tagged `v0.1.0`; every workstream
in scope is done (`v0.2.0` to `v0.7.0`). What is left is the `v1.0.0` decision: freezing the language. This file is the
overview; each workstream has its own detailed plan in [`docs/plan/`](docs/plan/).

## Scope

In scope, in build order:

| # | Workstream | Detailed plan | Size |
| --- | --- | --- | --- |
| 1 | Make the core solid | [01-solid-core.md](docs/plan/01-solid-core.md) | about 3 weeks |
| 2 | Seven layouts: flow (existing), free, stack, cycle, timeline, compare, mind map, sequence | [02-layouts.md](docs/plan/02-layouts.md) | about 4 weeks |
| 3 | Playground as a product | [03-playground.md](docs/plan/03-playground.md) | about 3 weeks |
| 4 | React wrapper and Markdown plugin | [04-react-and-markdown.md](docs/plan/04-react-and-markdown.md) | about 1.5 weeks |

Estimates assume one developer working full time. About 11–12 weeks in all.

Added 2026-11-08, after v0.8.0 (the chart layout):

| # | Workstream | Detailed plan | Size |
| --- | --- | --- | --- |
| 5 | Layouts tree, state, venn, quadrant; sequence frames | [05-more-layouts.md](docs/plan/05-more-layouts.md) | about 5 weeks |
| 6 | elkjs for big flow diagrams (spike first, go/no-go) | [06-elk-flow.md](docs/plan/06-elk-flow.md) | 2 days to 1.5 weeks |
| 7 | Better errors, language server, freeze at 1.0 | [07-language-v1.md](docs/plan/07-language-v1.md) | about 3 weeks |

Out of scope for now (decided 2026-11-06):

- Stroke fonts and capturing your own handwriting. The web fonts with per-letter
  jitter stay.
- Explainer mode: camera moves, read-aloud captions, GIF and MP4 export.
- Image-URL render server, oEmbed, Obsidian and VS Code plugins.
- Mermaid import. It can be added later on top of the new parser.

## Milestones

Each milestone ends with a tag, a green test run and an updated playground.

| Tag | Contains | Depends on |
| --- | --- | --- |
| `v0.2.0` ✅ | Workstream 1, part A: font metrics, scene model, new parser with source positions, test setup | — |
| `v0.3.0` ✅ | Workstream 1, part B: language additions, global label placement, accessibility, performance | v0.2 |
| `v0.4.0` ✅ | Layouts: free, stack, cycle | v0.3 |
| `v0.5.0` ✅ | Layouts: timeline, compare, mind map, sequence | v0.4 |
| `v0.6.0` ✅ | Playground: code editor, library, click-to-edit, export, share, templates | v0.3 (can run beside the layouts) |
| `v0.7.0` ✅ | React wrapper, Markdown plugins, command-line renderer | v0.3 (the build-time Markdown mode needs the font metrics from v0.2) |
| `v0.8.0` ✅ | Chart layout | v0.5 |
| `v0.9.0` | Layouts: tree, state; self-loops in flow | v0.8 |
| `v0.10.0` | Sequence frames; layouts: venn, quadrant | v0.9 |
| `v0.10.x` | elkjs spike and, if go, `engine elk` | v0.8 (can run beside the layouts) |
| `v0.11.0` | Better errors; completion, hover and language server in the core | v0.10 |
| `v1.0.0` | Language frozen: spec, compatibility corpus, naming pass | all |

```
v0.2 ──► v0.3 ──► v0.4 ──► v0.5 ──────────► v1.0
           │                                  ▲
           ├──► v0.6 (playground) ────────────┤
           └──► v0.7 (React, Markdown) ───────┘
```

With two people, one takes layouts and the other takes the playground after v0.3.

## Rules that apply to every workstream

- **Text is the source of truth.** Every control, drag or inline edit writes back
  to the source text.
- **Same text, same drawing.** All randomness is seeded. Golden tests depend on it.
- **The core has no framework.** `src/core` needs a DOM-like document and nothing
  else, so it runs in browsers, in React, in the web component and in Node with a
  DOM shim.
- **Readable before pretty.** Mess never makes labels overlap.
- **No npm registry.** Releases are git tags with `dist-lib/` committed. See the
  README for the four ways to consume it.

### Definition of done for any feature

1. Unit tests, plus a golden SVG for anything that draws.
2. A row on the Syntax page and, for a new layout or shape, an example in the gallery.
3. Error messages for every way the new syntax can be written wrong.
4. Works in light and dark playground themes, and on phone width.
5. `npm run check` passes: type-check, tests, library build.

## Release process

1. `npm run check`.
2. Bump `version` in `package.json` and `src/lib.ts`.
3. `npm run build:lib` and commit `dist-lib/` with the change.
4. Tag `vX.Y.Z`. Consumers pin to tags.

## Risks

| Risk | Plan |
| --- | --- |
| dagre's routing is weak for big graphs | Keep `layout()` behind the scene interface so elkjs can replace dagre for flow only |
| Measuring text without a browser | Font metrics JSON generated once from real fonts (workstream 1) |
| Sequence diagrams pull in a lot of syntax (loops, alternatives) | Ship the basic form first; frames are a separate later step |
| The playground grows into a second product | Every playground feature must reuse core APIs; no drawing logic in `src/app` |
| Name clash with existing "Inkling" products | Check before any public launch |
