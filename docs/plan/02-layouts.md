# Workstream 2 — Layouts

Goal: seven ways to explain something, all from the same language, the same pen
and the same marks. Requires the scene model and label pass from workstream 1.

`layout <name>` picks the layout. If there is no layout line, it is `flow`.

| Layout | For | Tag |
| --- | --- | --- |
| `flow` | Processes, systems, decisions (exists) | — |
| `free` | Full control over positions | v0.4.0 |
| `stack` | Layers, such as a network model or an architecture | v0.4.0 |
| `cycle` | Loops, such as a habit loop or a sales funnel feedback loop | v0.4.0 |
| `timeline` | Events over time | v0.5.0 |
| `compare` | X versus Y | v0.5.0 |
| `mindmap` | One idea branching out | v0.5.0 |
| `sequence` | Who talks to whom, in order | v0.5.0 |

The four simpler layouts go first because they shake out the scene model before
the hard ones.

## Shared building blocks

### Outline bullets

Several layouts read better as an indented list than as arrows. Bullets work in
every layout:

```
- Learning a language
  - Vocabulary
    - Flashcards as cards
  - Grammar
```

- Each bullet creates a node. The id is a slug of the text (`learning-a-language`),
  or what follows `as`.
- Indentation (2 spaces or a tab) makes a parent → child relationship. In flow
  layout this draws an arrow. In mind map and stack it means nesting.
- Bullets and normal statements can be mixed. `circle cards` works on a bullet node.

### Common rules

- Every layout returns a `Scene`. Layouts never draw.
- Every layout states its humanise limits: maximum tilt, maximum jitter, and
  whether connectors may bow.
- Every layout states its default step order when there are no `step` lines and
  `steps auto` is on.
- Marks (`circle`, `note`, `highlight`, `underline`, `strike`, `check`, `cross`)
  work in every layout because they target nodes and arrows in the scene.
- `direction right|down` is honoured where it makes sense; each section says how.
- Each layout gets two gallery examples, a syntax section, golden tests and
  layout-specific invariant tests.

---

## free (v0.4.0, about 3 days)

```
layout free
api: box "API" at 200,120
db: db "Orders" below api
cache: round "Cache" right of api
api -> db
api ~> cache
```

- `at x,y` gives the node's centre in pixels, measured from the top-left.
- Relative placement: `below X`, `above X`, `left of X`, `right of X`, with an
  optional gap (`below api gap=80`). The default gap is 60.
- Nodes with no position go in a row under the placed ones, with a warning.
- Arrows are straight with a bow. If a straight line crosses another node, bend it
  around that node.
- The canvas fits the content plus a margin; negative coordinates shift everything.
- The humaniser may tilt but never moves nodes, because the author placed them.
- The playground (workstream 3) can drag nodes, writing `at x,y` back to the source.
- Invariant tests: positions match the source exactly; relative chains resolve;
  cycles in relative placement are reported as an error.

## stack (v0.4.0, about 3 days)

```
layout stack
- Application
- Transport
- Network
- Link
brace application..transport "your code"
note network "IP lives here"
```

- Top-level bullets (or nodes in declaration order) become equal-width boxes
  stacked top to bottom, touching or with a small gap (`gap=0..40`).
- Width is the widest label plus padding. Height comes from the label.
- Child bullets become smaller boxes side by side inside their layer, such as
  "TCP" and "UDP" inside "Transport".
- `brace a..b "label"`: a hand-drawn curly bracket on the right spanning layers a
  to b, with the label beside it. New decoration type.
- Arrows between layers are allowed and drawn on the left edge so they do not cross
  labels.
- `direction right` lays the stack out horizontally, as in a pipeline of stages.
- Default auto steps: top layer first.

## cycle (v0.4.0, about 3 days)

```
layout cycle
center "The habit loop"
cycle cue, craving, response, reward
cue: circle "Cue"
note reward "dopamine!"
```

- `cycle a, b, c, d` creates the arrows a→b→c→d→a. Explicit arrows can be used
  instead or as well, such as a shortcut across the middle.
- Nodes sit evenly on a circle, starting at 12 o'clock and going clockwise
  (`counterclockwise` attribute flips this). The radius is chosen so neighbouring
  boxes keep at least 40 px apart.
- Arrows are arcs that follow the circle, trimmed at each box, with arrowheads.
- `center "text"` is handwritten in the middle and may be circled.
- Arrow labels sit outside the circle.
- Default auto steps: in cycle order, and the closing arrow draws last.

## timeline (v0.5.0, about 4 days)

```
layout timeline
- 1969: Moon landing
- 1989: Web invented
- 2007: iPhone
- 2022: ChatGPT
span 1939..1945 "WWII"
highlight 2007
```

- Each bullet is `date: text`. The id is the date (`2007`), or set it with `as`.
- If every date is a number or an ISO date, events are spaced to scale, with a
  minimum gap. A gap more than three times the median is shortened and drawn with a
  zig-zag break in the axis. Otherwise events are evenly spaced in source order.
- The axis is one long hand-drawn arrow with tick marks.
- Event text alternates above and below the axis, each with a short connector line.
  The label pass may push labels further out to avoid overlaps.
- `span a..b "label"` draws a bracket along the axis for a period.
- `direction down` makes a vertical timeline with text on alternating sides; it is
  better on phones and for long lists.
- Default auto steps: left to right.

## compare (v0.5.0, about 4 days)

```
layout compare
columns "SQL", "NoSQL"
row "Schema": "fixed", "flexible"
row "Joins": yes, no
row "Scale": "up", "out"!
row "Transactions": yes, partly
```

- `columns` sets the headings; two or more are allowed. With exactly two, a
  circled "vs" sits between the headings.
- Each `row` has a label and one cell per column. A row with too few or too many
  cells is an error.
- Cell values:
  - `yes` draws a tick; `no` draws a cross; `partly` draws a wavy tick.
  - Quoted text is handwritten.
  - A trailing `!` circles the cell, to show the winner.
- Drawing: headings are underlined, hand-drawn rule lines separate the rows, and a
  wobbly vertical divider separates the columns. No full grid, which reads as a
  spreadsheet.
- Ids for marks: `sql`, `schema`, and `schema.sql` for a single cell.
- `direction down` swaps rows and columns, for long comparisons on narrow screens.
- Default auto steps: the headings, then one row per step.

## mindmap (v0.5.0, about 5 days)

```
layout mindmap
- Learning a language
  - Vocabulary
    - Flashcards
    - Reading
  - Grammar
  - Speaking
    - Tandem partner
```

- The tree comes from the bullets. Arrows `a -> b` also work, in which case the
  root is the node with no incoming arrow, or `root x` sets it.
- Shapes by level:
  - level 0: a cloud;
  - level 1: round boxes;
  - level 2 and deeper: plain text with a short underline.
- Layout: the first-level branches are split between the right and left sides,
  balancing the total leaf count. Each side is laid out as a tidy tree
  (Reingold–Tilford): children stacked vertically, parents centred on their children.
- Connectors are tapered organic curves, thicker near the root, with no
  arrowheads. They are drawn as filled shapes rather than strokes, and the draw-on
  animation reveals them with a clip.
- `colors on` gives each first-level branch its own ink from a palette that works
  on light and dark papers.
- `direction down` builds an org-chart-style tree instead.
- Default auto steps: root, then each first-level branch with all its children.

## sequence (v0.5.0, about 6 days)

```
layout sequence
you: person "You"
app: box "App"
google: box "Google"

you -> app : "Sign in"
app -> google : "redirect"
google --> app : "token"
app -> app : "save session"
note app "stores the token,\nnever the password"
```

- Participants are nodes, left to right in declaration order, drawn at the top with
  a lifeline below each. The lifeline is a slightly wobbly dashed line that is kept
  vertical.
- Messages are the arrows, top to bottom in source order. Row height comes from the
  label. `-->` is a reply (dashed), `~>` is async (squiggly), and `a -> a` is a
  loop back to the same lifeline.
- Notes are placed at the row where they appear in the source, beside the
  participant's lifeline. This is why the parser keeps statement order.
- `activate app` and `deactivate app` draw a narrow box on the lifeline between
  those rows.
- Participants are repeated at the bottom when there are more than 8 messages
  (`footer off` turns this off).
- Default auto steps: one message per step. This is the most useful explainer case.
- Later, not in v0.5: frames for `loop "every 5s" { … }`, `alt "ok" { … } else
  "error" { … }` and `opt`, drawn as hand-drawn boxes with a tab label.
- Invariant tests: messages never overlap vertically, labels stay between their two
  lifelines, and lifelines are long enough for every message.

---

## Gallery and documentation

- For each layout: two examples, a playground template (workstream 3) and a section
  on the Syntax page.
- The Syntax page gains a layout picker that filters the rows to the ones that
  apply.
- "Which layout should I use?" guide on the How it works page: a small decision
  tree drawn in Inkling's own flow layout.

**Done when (v0.5.0):** all eight layouts pass golden, invariant and fuzz tests; each
has two gallery examples; every mark works in every layout (a test matrix of mark ×
layout).
