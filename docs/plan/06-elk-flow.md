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
