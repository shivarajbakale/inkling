# Workstream 5: Four more layouts and sequence frames

Goal: cover the diagrams teachers and engineers draw most that Inkling still
can't: hierarchies, state machines, overlapping sets and 2×2 grids. Also finish
sequence diagrams with frames. Every rule in [02-layouts.md](02-layouts.md)
("Common rules") applies here too: layouts return a `Scene` and never draw, marks
work everywhere, each layout has two gallery examples, golden and invariant tests,
a template, and a section on the Syntax page.

| Layout or feature | For | Tag | Size |
| --- | --- | --- | --- |
| `tree` | Org charts, file trees, taxonomies, decision trees | v0.9.0 | about 4 days |
| `state` | State machines, lifecycles, protocols | v0.9.0 | about 5 days |
| sequence frames | `loop`, `alt`/`else`, `opt`, `par`, `note over` | v0.10.0 | about 5 days |
| `venn` | Overlapping sets, "what X and Y share" | v0.10.0 | about 5 days |
| `quadrant` | 2×2 grids: effort/impact, urgent/important | v0.10.0 | about 3 days |

Tree and state go first because they reuse the most existing code: tree uses the
mind map's tidy-tree pass, and state uses flow's dagre placement. Frames come next
because they touch the parser's block handling, which venn and quadrant don't
need.

New words this workstream adds to the language: `else`, `and`, `loop`, `alt`,
`opt`, `par`, `over`, `start`, `final`, `set`, `in`, `quadrants`. Every one gets
an entry in `KEYWORDS`, a highlighting rule and completions. Each must still work
as a node id when used as one (`loop: box "Loop"`). The rule is the one groups
follow today: a keyword is a statement only when it isn't followed by `:`.

---

## Shared work first (about 2 days)

- **Extract the tidy tree.** Move the Reingold–Tilford pass out of
  `src/core/layouts/mindmap.ts` into `shared.ts` as
  `tidyTree(roots, sizeOf, { gapSibling, gapLevel, axis })`. Mind map keeps its
  output exactly as it is: its golden files must not change.
- **Self-loops and pairs of arrows.** Add a loop drawn above the node for
  `a -> a`, and separate bows for `a -> b` plus `b -> a`, to the shared edge
  router, so flow gets them too. State machines need both all the time.
- **Block stack in the parser.** Today `}` only closes a group
  (`groupStack` in `src/core/syntax/parser.ts`). Make one stack of open blocks
  (group or frame) so `}` closes whichever opened last, and so
  `} else "x" {` can close one branch and open the next. `E-UNCLOSED-GROUP` grows
  a twin, `E-UNCLOSED-FRAME`.
- **Region ids for marks.** Venn regions get ids like `dogs&cats`. Allow `&` inside
  mark targets (`highlight dogs&cats`), the way `a->b` is allowed today.

---

## tree (v0.9.0)

```
layout tree
- CEO
  - CTO
    - Platform
    - Product eng
  - CFO
  - COO
    - Ops
```

The mind map's `direction down` already makes a rough org chart, but its levels
change shape, its curves taper, and it has one root. A tree is the formal version:

- The tree comes from bullets, or from arrows (`ceo -> cto`). The roots are nodes
  with no incoming arrow. More than one root is allowed and draws a forest, side
  by side.
- Every level uses the same shape, `box` by default. A node's own shape still wins
  (`ops: round "Ops"`).
- `direction down` (default): children sit below their parent. `direction right`:
  a file-tree layout, with children to the right of the parent and siblings
  stacked.
- `branches elbow` (default): org-chart connectors, a line down from the parent,
  across, then down to each child. `branches straight` draws direct lines.
  Either way there are no arrowheads, unless the source writes the arrow with
  a label or a kind other than solid.
- Siblings with the same parent line up on one row. A long label wraps instead of
  pushing the row wider than 3× the median node.
- Arrows that aren't parent → child (`cto ~> cfo : "reports"`) are drawn as bowed
  curves on top and don't change placement.
- A cycle in the arrows is an error, `E-TREE-CYCLE`: "A tree can't loop back:
  `a -> b -> a`." Its hint suggests `layout flow` or `layout state`.
- Auto steps: level by level, top first. The playground's step control can switch
  to one subtree per step.
- Invariant tests: no two boxes overlap; every parent is centred over its children
  (within 1 px); connectors never cross a box; a forest has no overlap between
  trees.

## state (v0.9.0)

```
layout state
start idle
idle: round "Idle"
loading: round "Loading"
idle -> loading : "fetch"
loading -> idle : "done"
loading -> error : "fail"
error -> idle : "retry"
loading -> loading : "progress"
final error
```

- `start x` puts a filled dot before state `x`, with an arrow into it.
  `final x` puts a bullseye after `x`, with an arrow from it. Each can appear more
  than once. These dots are new shapes, `dot` and `bullseye`, so they also work
  in other layouts (`s: dot`).
- States default to `round`. Transitions are ordinary arrows. A label is free
  text: `"click [enabled] / save"` is fine, and the guard in brackets is set in a
  smaller hand.
- Placement uses dagre (the flow engine), ranked from the start states, so the
  happy path reads left to right (`direction right`, the default here) or top to
  bottom.
- Self-loops and pairs of arrows use the shared router (see "Shared work").
  A self-loop's label sits outside the loop.
- Composite states are groups: `group loading "Loading" { fetching, parsing }`.
  An arrow to the group lands on its border.
- Warnings: `W-STATE-UNREACHABLE` for a state that no start can reach,
  `W-STATE-NO-START` when there is no `start` line (the first state is used).
- Auto steps: breadth-first from the start states, one state and its incoming
  transitions per step. This is the order you would explain it in.
- Invariant tests: self-loop labels never overlap their node; the two arrows of a
  pair never touch; start and final dots never overlap a label.

## Sequence frames (v0.10.0)

This finishes the item "Later, not in v0.5" in [02-layouts.md](02-layouts.md).

```
layout sequence
you: person "You"
app: box "App"
api: box "API"

you -> app : "Open feed"
opt "not cached" {
  app -> api : "GET /feed"
  api --> app : "posts"
}
loop "every 30s" {
  app -> api : "poll"
}
alt "signed in" {
  app --> you : "feed"
} else "signed out" {
  app --> you : "login page"
}
par {
  app -> api : "track view"
} and {
  app --> you : "render"
}
note over app, api "same data centre"
```

- Frame kinds: `loop`, `opt`, `alt` (with any number of `else` branches) and `par`
  (with `and` branches). Each takes an optional quoted label (the condition).
- Drawing: a hand-drawn rectangle with a small notched tab at the top left. The
  tab holds the kind (`loop`) and the label sits beside it in brackets. Each
  `else` or `and` adds a dashed divider across the frame, with its own label.
- The frame is as wide as the leftmost to the rightmost lifeline used inside it,
  plus padding. It is always wider than any frame nested inside it. Frames can
  nest three deep; a fourth level is `E-FRAME-TOO-DEEP`.
- Rows: a frame adds a header row for its tab and a small gap at the bottom. Notes
  and activations inside a frame stay in the frame.
- `note over a "…"` centres a note on one lifeline. `note over a, b "…"` spans two.
  This replaces the side note when written with `over`.
- Steps: the frame draws together with its first message. Each `else` divider
  draws with the first message of its branch.
- Errors: `E-FRAME-LAYOUT` (a frame outside `layout sequence`; its hint suggests
  `group`), `E-ELSE-WITHOUT-ALT`, `E-AND-WITHOUT-PAR`, `E-UNCLOSED-FRAME`,
  `W-EMPTY-FRAME`.
- `format` indents frame bodies by two spaces, like groups.
- Invariant tests: frames never cross each other except by nesting fully; no
  message label crosses a frame border; tab labels never overlap a message
  label.

## venn (v0.10.0)

```
layout venn
set dogs "Dogs"
set cats "Cats"
- Barks in dogs
- Meows in cats
- Fur in dogs & cats
- Four legs in dogs & cats
highlight dogs&cats
```

- `set id "Label"` declares a circle. Two or three sets; more is `E-VENN-TOO-MANY`,
  because four circles can't show every overlap (its hint suggests `compare`).
- Items are bullets, or ordinary nodes, with `in a`, `in a & b` or `in a & b & c`.
  An item without `in` sits outside every circle, in the "neither" corner. That
  corner shows only when it has items.
- Geometry: the circles sit in a fixed arrangement (side by side for 2, a triangle
  for 3). The radius grows until the busiest region fits its items, stacked as
  handwritten text. The overlap widens when a shared region holds more items.
  Every region keeps a minimum label area, even when it is empty.
- Set labels sit outside their circle, on the side away from the others.
- Each set gets its own ink from the palette that `colors on` uses, with light
  pencil hatching where the sets overlap.
- Marks: `circle barks` and `note fur "…"` work on items. `highlight dogs&cats`
  hatches just that region, clipped to its exact shape. That's why regions are
  real scene objects with outlines.
- Errors: `E-UNKNOWN-SET` (with a "Did you mean"), `E-SET-TWICE` for
  `in dogs & dogs`.
- Auto steps: each circle with its own items, then the overlaps, largest first.
- Invariant tests: every item's text box lies fully inside its region and outside
  every other region; set labels never overlap a circle they don't belong to.

## quadrant (v0.10.0)

```
layout quadrant
axis x "Effort" low..high
axis y "Impact" low..high
quadrants "Quick wins", "Big bets", "Fill-ins", "Money pit"
- Dark mode at 0.2,0.8
- Rewrite the app at 0.9,0.9
- Fix typos at 0.1,0.2
- Migrate DB in "Money pit"
```

- `axis x|y "Label"` reuses the chart word. `low..high` gives the words written at
  each end of the axis (optional).
- `quadrants` names the four squares in reading order: top left, top right,
  bottom left, bottom right. Without it the squares have no names.
- Items are bullets or nodes. `at x,y` takes values from 0 to 1, with (0,0) at
  the bottom left, because that is how a 2×2 is read (this differs from free
  layout, which measures pixels from the top left). `in "Name"` (or the
  quadrant's slug) drops the item in that square, spread out evenly.
- Items draw as small dots with a handwritten label. The label pass from
  workstream 1 keeps labels apart, and only labels move, never dots.
- Drawing: two long hand-drawn arrows cross in the middle. Quadrant names are
  large, faint and handwritten in each corner.
- Errors: `E-QUADRANT-RANGE` for `at 1.4,0.2`; `E-UNKNOWN-QUADRANT`.
- Auto steps: the axes, then each quadrant with its items, in reading order.
- Invariant tests: each dot sits at its exact position; no label overlaps another
  label or a quadrant name.

---

## Done when

- **v0.9.0:** tree and state pass golden, invariant and fuzz tests, and are added
  to the mark × layout test matrix; the mind map's golden files are unchanged
  after the tidy-tree extraction; flow's golden files are updated only for
  diagrams that have self-loops.
- **v0.10.0:** the same for venn, quadrant and frames. The "Which layout should I
  use?" guide covers all twelve layouts. `docs/errors.md` lists every new code.
- Both: the playground's layout picker, templates and Syntax page include the new
  layouts, in light and dark themes, at phone width.

## Risks

| Risk | Plan |
| --- | --- |
| New keywords break existing diagrams whose node ids are `set`, `loop` and so on | Keywords are statements only when not followed by `:`. The compatibility corpus (workstream 7) is run before every tag |
| Venn regions are hard to fit text in when one region is crowded | Grow the radius first, then shrink the text one size, then warn with `W-VENN-CROWDED` |
| Frames make the sequence layout's row maths much harder | Frames are added as a separate row pass after messages are placed, with their own invariant tests |
| Twelve layouts make the language feel big | The Syntax page filters by layout, and each layout has one obvious starting template |
