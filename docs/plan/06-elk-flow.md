# Workstream 6: elkjs for big flow diagrams

Goal: flow diagrams with 30 or more nodes stay readable. dagre is weak there: its
edges cross boxes, crossings pile up, and it doesn't route edges at right angles.
PLAN.md has listed this as a risk since v0.2. This workstream starts with a spike
and a go/no-go decision, because elkjs is large.

Size: about 2 days for the spike, then about 6 days if it goes ahead.

## The problem with just adding it

- **Size.** The library is about 36 KB gzipped today. `elk.bundled.js` is more
  than a megabyte unpacked, likely several times the whole library even
  gzipped. The spike measures the real number.
- **Async.** ELK's `layout()` returns a promise. The scene pipeline
  (`parse → layout → humanise → draw`) is synchronous today, and `renderToSVG` in
  Node is synchronous too.
- **Same text, same drawing.** ELK is deterministic for the same input and
  options, but the golden tests must prove that across machines, the way v0.7.2
  did for fonts.

## Result (v0.10.1): no-go

The spike ran on 10 diagrams of 26 to 60 nodes in `tests/fixtures/big/`. Three
of them have no groups and go top to bottom, and two have nested groups. Each one
was laid out three ways, all through the normal pipeline (humanise, router,
labels, pen): dagre as today, ELK `layered` with orthogonal routes (corners
rounded so the pen's curve follows them), and ELK `layered` with splines. To run
it again: `npx vitest run -c scripts/elk-spike/vitest.config.ts`.

| Diagram | Nodes | Crossings (dagre / ortho / spline) | Arrows through boxes (dagre / ELK) |
| --- | --- | --- | --- |
| 01 microservices | 60 | 5 / 5 / 5 | 0 / 0 |
| 02 compiler | 35 | 3 / 5 / 5 | 0 / 0 |
| 03 CI/CD | 31 | 0 / 0 / 0 | 0 / 0 |
| 04 shop, groups | 31 | 6 / 0 / 0 | 5 / 0 |
| 05 data platform | 44 | 4 / 1 / 1 | 0 / 0 |
| 06 sign-in, down | 28 | 2 / 0 / 0 | 0 / 0 |
| 07 ML training | 34 | 2 / 0 / 0 | 0 / 0 |
| 08 k8s, groups | 26 | 6 / 2 / 2 | 1 / 0 |
| 09 support, down | 31 | 0 / 0 / 0 | 0 / 0 |
| 10 payments | 35 | 1 / 0 / 0 | 0 / 0 |

- **Time** was never a problem. ELK took 16 to 48 ms per diagram once warm, and
  dagre took 8 to 28 ms.
- **Size** rules it out as a default: `elk-worker.min.js` is 472 KB gzipped,
  more than five times the whole library (84 KB gzipped). It is a single GWT
  build, so `layered` can't be split out.
- **Numbers.** ELK has fewer crossings on 6 of 10 diagrams, but the margins are
  small except on the two group diagrams. Total line length is about even:
  ELK's is 21 to 36 % longer on four diagrams and a little shorter on five. Its
  lines turn about twenty times as much: an orthogonal route turns two or three
  times per arrow, where dagre's direct lines mostly don't turn.
- **Screenshots decided it.** ELK's orthogonal routes share channels: many
  arrows run side by side, a few pixels apart, for most of their length, and
  arrowheads pile up where they arrive. A precise pen can show that; the sketch
  pen blurs those lines into one thick stroke, and it's no longer clear which
  arrow goes where. Splines have the same channels, plus loops where they meet the
  humaniser's nudges. dagre's lines are longer and cross a little more, but each
  one stays readable.

So ELK doesn't clearly win on 7 of 10. Under the plan's no-go branch, dagre was
improved instead:

- **More detours (v0.10.1).** The router used to bend a direct arrow around the
  first node in its way and nothing more. If the arrow still cuts through a box,
  it now tries three ways round: every detour on the side of the first one, every
  detour on the other side, or each one on its nearer side. It keeps the way that
  hits the fewest boxes, then the one that turns least, and falls back to the
  single detour if none is better. Arrows through boxes across the 10 diagrams
  went from 6 to 1. No existing golden drawing changed, because a drawing changes
  only where an arrow was still cutting through a box.
- `tests/layouts.test.ts` ("big flow diagrams") checks that each big diagram has
  at most one arrow through a box and no overlapping nodes.
- **Kept for later:** `elkjs` stays a dev dependency, only so the spike can be
  run again. Remove it with the spike once nobody wants a rerun. The
  "Big diagram" hint and `engine elk` aren't built.

The plan below is kept for the record.

## Plan

### Phase 1: spike (about 2 days)

1. Gather 10 big diagrams into `tests/fixtures/big/`: real architectures, a
   compiler pipeline, a 60-node microservice map.
2. Lay out each one with dagre (today) and with ELK `layered`, using orthogonal
   and spline routing. Render all three side by side with the screenshot review
   script.
3. Measure crossings, edges through boxes, bends, total area, time, and the gzip
   cost of the smallest ELK build that works (the `layered` algorithm only, if
   it can be split out).

**Go** if ELK clearly wins on 7 of the 10 and costs less than 1 s per diagram.
**No-go:** improve dagre instead. Add a pass after dagre that reroutes edges
that cross boxes, the same router free layout uses, and close this workstream.

### Phase 2: if it goes ahead (about 6 days)

- **Opt-in, loaded only when used.** `engine elk` in the source, or
  `{ engine: 'elk' }` as an option. ELK ships as a separate file,
  `dist-lib/inkling-elk.js`, which is loaded only when a diagram asks for it. The
  core build stays the same size. The IIFE build gets `setEngineSource(url)`, the
  same pattern as `setFontSource`.
- **Async path.** `drawInto` and `mount` are already async; they await the engine.
  Add `renderToSVGAsync` for Node and use it in the CLI and the Markdown plugins
  (both run at build time, so async is fine). The sync `renderToSVG` keeps dagre
  and warns `W-ENGINE-SYNC` when a diagram asks for ELK.
- **Same scene.** ELK fills in the same node positions and edge routes in the
  `Scene` that dagre does, so the humaniser, labels and drawing don't change.
  The line in PLAN.md, "Keep `layout()` behind the scene interface", is what
  makes this possible.
- **Hint, not auto-switch.** At more than 30 nodes, flow layout with dagre gives
  an info hint: "Big diagram: `engine elk` may route it more cleanly." Switching
  automatically would change existing drawings, which breaks "same text, same
  drawing."
- **Groups.** ELK supports nested groups (compound nodes), which dagre does
  badly. Map Inkling groups to ELK's hierarchy.

## Done when

- The spike's results and decision are written up in this file.
- If it goes ahead: golden tests for the big fixtures on both engines, identical
  across Node and the browser; the core bundle grows by less than 1 KB; the
  Syntax page documents `engine`; the playground loads ELK on demand.

## Risks

| Risk | Plan |
| --- | --- |
| ELK's orthogonal routes look machine-made, against the hand-drawn style | The humaniser bows and jitters the segments; the spike reviews screenshots, not just numbers |
| Two engines double the test surface | ELK only applies to `flow`; every other layout keeps its own placement |
| The ELK build can't be split, so `layered` alone is still huge | It's acceptable because it is opt-in and lazy. Say so in the README |
