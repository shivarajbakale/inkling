# Diagnostics

`parse(source).diagnostics` lists problems with the source. Each one has:

| Field | Meaning |
| --- | --- |
| `code` | A stable code from the table below. Safe to match on. |
| `severity` | `error`: the line was skipped. `warning`: drawn anyway, but probably not what you meant. |
| `message` | What is wrong, in plain words. |
| `hint` | What to do, often "Did you mean …?" |
| `fix` | When the fix is mechanical: a `span` and the `text` to put there. An empty span inserts. The playground's Fix button and the language server's quick fix apply it. |
| `span` | Where it is: `line`, and `from`/`to` offsets into the whole source. |
| `related` | Other places with the same cause, such as every later use of one misspelt name. Reported once, not once per use. |

The parser never throws. One bad line never changes how other lines are read.

| Code | Severity | Example that triggers it | Message |
| --- | --- | --- | --- |
| `E-UNCLOSED-STRING` | error | `a: box "oops` | This text is missing its closing quote. Fix: adds it. |
| `E-MISSING-VALUE` | error | `paper` | "paper" needs a value. |
| `E-UNEXPECTED` | error | `paper notebook extra` | Something is left over that does not belong there. |
| `E-UNKNOWN-PAPER` | error | `paper notbook` | No paper called "notbook". Suggests the closest name. |
| `E-UNKNOWN-PEN` | error | `pen markr` | No pen called "markr". |
| `E-UNKNOWN-HAND` | error | `hand cavet` | No handwriting called "cavet". |
| `E-UNKNOWN-LAYOUT` | error | `layout left` | Layout can be "right" or "down". |
| `E-BAD-MESS` | error | `mess 3` | Mess is a number from 0 (tidy) to 1 (chaotic). |
| `E-BAD-SEED` | error | `seed 1.5` | Seed is a whole number. |
| `E-ARROW-NEEDS-ENDS` | error | `a -> ` | An arrow needs a name on both sides. |
| `E-BAD-ARROW` | error | `a => b`, `a - > b`, `a —> b` | Not an arrow in Inkling. Fix: `->` (or `-->` for `--->`). |
| `E-MISSING-COLON` | error | `api box "API"` | A node needs a `:` after its name. Fix: adds it. |
| `E-BAD-NAME` | error | `.com -> b` | Not a valid name; use letters, digits, - or _, or quotes. |
| `E-BAD-NODE` | error | `a: box "A" red extra` | Write a node as `a: box "Label"`. |
| `E-UNKNOWN-SHAPE` | error | `a: rectangel` | No shape called "rectangel". |
| `E-UNKNOWN-COLOR` | error | `a: box "A" yelow` | No colour called "yelow". |
| `E-DUPLICATE-NODE` | error | `a: box` twice | "a" is already defined on line N. The later one wins. |
| `E-NOTE-NEEDS-TEXT` | error | `note a` | A note needs text. |
| `E-UNKNOWN-TARGET` | error | `circle aple` | There is no node called "aple". Suggests and fixes to the closest name in the file. |
| `E-UNKNOWN-LINE` | error | `papr notebook` | I don't understand this line. Suggests and fixes to a keyword if one is close. |
| `W-STEP-UNKNOWN` | warning | `step 1: aple` | Step 1 names "aple", which is not a node. Fix: the closest name. |
| `W-NEW-NAME` | warning | `server: box` then `a -> serer` | "serer" isn't defined, so it is drawn as a new box. Did you mean "server"? Names that differ only in digits (`step1`, `step2`) don't count. |
| `E-UNKNOWN-OPTION` | error | `a: box colour=red` | There is no "colour" option here. Suggests the closest. |
| `E-BAD-OPTION` | error | `a: box color=redd` | "redd" is not a color. Suggests the closest. |
| `E-BAD-GROUP` | error | `group g "G"` | A group needs a { after its name. |
| `E-DUPLICATE-GROUP` | error | two `group g {` | There is already a group called "g". |
| `E-GROUP-TOO-DEEP` | error | a group in a group in a group | Groups can sit inside one other group, not deeper. |
| `E-UNCLOSED-GROUP` | error | `group g {` with no `}` | Group "g" is never closed. Fix: adds a `}` line at the end. |
| `E-GROUP-NAME-TAKEN` | error | `g: box` and `group g {` | A name cannot be both a node and a group. |
| `W-EMPTY-GROUP` | warning | `group g {` then `}` | Group "g" has nothing in it. It is not drawn. |
| `E-ICON-NEEDS-NAME` | error | `a: icon "A"` | Name the icon. |
| `E-UNKNOWN-ICON` | error | `a: icon sever` | No icon called "sever". Suggests the closest. |
| `E-BAD-STEPS` | error | `steps manual` | Only `steps auto` exists. |
| `W-VERSION` | warning | `inkling 0` | This renderer reads version 1. |
| `E-VERSION-TOO-NEW` | error | `inkling 2` | The file is for a newer language. Nothing is drawn, rather than drawing it wrong. |
| `W-DEPRECATED` | warning | `brace a..b "x"` | An old name that still works. Fix: the new name (`span`). Deprecated words are removed only in Inkling 2. |
| `E-RESERVED` | error | `style a red` | The word is saved for a future version, so the line is skipped. Reserved: `import`, `use`, `style`, `class`, `link`, `theme`, `if`, `include`, `define`. They still work as names (`link: box`). |
| `W-NO-LABEL` | warning | `underline a -> b` on an unlabelled arrow | Nothing to underline. |
| `W-STEPS-IGNORED` | warning | `steps auto` plus `step` lines | The step lines win. |
| `W-WIDE` | warning | more than 7 columns left to right | Suggests `layout down`. Comes from the layout, not the parser. |
| `W-TOO-BIG` | warning | over 300 nodes, 600 arrows or 20,000 characters | Drawn without animation. Comes from `render`. |
| `E-EMPTY-BULLET` | error | `- ` | This bullet has no text. |
| `W-BULLET-INDENT` | warning | an indented first bullet | Indented, but no bullet above it. Treated as top level. |
| `E-BAD-CYCLE` | error | `cycle a` | A cycle needs at least two names. |
| `W-SECOND-CYCLE` | warning | two `cycle` lines | Only the first sets the circle; the second only adds arrows. |
| `E-BAD-RANGE` | error | `span a` | Write it as `span first..last "label"`. |
| `E-BAD-SWITCH` | error | `colors maybe` | Use `on` or `off`. |
| `E-BAD-GAP` | error | `gap 900` | Gap is 0 to 200 pixels. |
| `E-BAD-BRANCHES` | error | `branches curly` | Branches are `elbow` or `straight`. |
| `E-BAD-START` | error | `start a b` | `start` and `final` take one state name. |
| `E-BAD-FRAME` | error | `loop "x"` with no `{` | Write a frame as `loop "label" {`, its messages, then `}`. |
| `E-FRAME-TOO-DEEP` | error | four frames inside each other | Frames nest three deep. |
| `E-FRAME-LAYOUT` | error | `loop {` outside `layout sequence` | Frames only draw in sequence diagrams; use a group. |
| `E-ELSE-WITHOUT-ALT` | error | `} else {` closing a `loop` | `else` only follows an `alt`. |
| `E-AND-WITHOUT-PAR` | error | `} and {` closing an `alt` | `and` only follows a `par`. |
| `E-UNCLOSED-FRAME` | error | `opt {` with no closing `}` | Add a `}` line. Fix: adds one at the end. |
| `W-EMPTY-FRAME` | warning | `opt {` then `}` | The frame has no messages. |
| `E-VENN-TOO-MANY` | error | a fourth `set` line | Venn diagrams show two or three sets. |
| `E-UNKNOWN-SET` | error | `- Bark in dgos` | Suggests the closest set. Also for `highlight a&x`. |
| `E-SET-TWICE` | error | `in a & a` | A set is named twice. |
| `W-REGION-MARK` | warning | `note a&b "…"` | Only `highlight` and `circle` work on an overlap. |
| `E-BAD-IN` | error | `x: "X" in` | Write `in a & b` or `in "Square"`. |
| `E-BAD-QUADRANTS` | error | `quadrants "A", "B"` | Name all four squares. |
| `E-QUADRANT-RANGE` | error | `- X at 1.4,0.2` in a quadrant | Positions go from 0 to 1. |
| `E-UNKNOWN-QUADRANT` | error | `- X in "Nowhere"` | Suggests the closest square. |
| `W-DUPLICATE-START` | warning | `start a` twice | The second one is ignored. |
| `E-BAD-PLACE` | error | `a: box right a` | Positions are `at 200,120`, `below x`, `above x`, `left of x`, `right of x`. |
| `E-ROW-CELLS` | error | a row with too few cells | Row "x" has 1 cell but there are 2 columns. |
| `W-WRONG-LAYOUT` | warning | `set a "A"` without `layout venn` | This statement only draws in another layout: `columns`/`row` (compare), chart lines (chart), `axis` (chart, quadrant), `set` (venn), `quadrants` (quadrant), `activate`, `footer`, `note over` (sequence), `branches` (tree), `root`, `colors` (mindmap), `center` (cycle), `span` (timeline, stack), `gap` (stack). Fix, when the file has no layout line: adds one. Was `W-NOT-USED` before v0.11. |
| `W-NO-CYCLE` | warning | `layout cycle` with no `cycle` line | Nodes go round in written order. From the layout. |
| `W-NO-COLUMNS` | warning | `layout compare` with no `columns` | Nothing to compare. From the layout. |
| `W-MANY-ROOTS` | warning | two top-level bullets in a mind map | The first is the centre. From the layout. |
| `E-TREE-CYCLE` | error | `a -> b` and `b -> a` in a tree | A tree can't loop back; the closing link is dropped. From the layout. |
| `W-VENN-SETS` | warning | `layout venn` with fewer than two sets | From the layout. |
| `W-VENN-CROWDED` | warning | a region too full for its items | From the layout. |
| `W-QUADRANT-UNPLACED` | warning | a quadrant item with no `at` or `in` | Drawn under the grid. From the layout. |
| `W-STATE-NO-START` | warning | `layout state` with no `start` line | The first state is used as the start. From the layout. |
| `W-STATE-UNREACHABLE` | warning | a state no arrow leads to from the start | From the layout. |
| `W-PLACE-LOOP` | warning | `a below b` and `b below a` | Placed in a loop. From the free layout. |
| `W-UNPLACED` | warning | a node with no position in the free layout | Drawn in a row underneath. |
| `E-BAD-CHART` | error | `buy 105` | Write it as `buy <bar> <price> "label"`; each chart line says its own form. |
| `W-CANDLE` | warning | `candles 100 99 98 103` | A candle's high is below its open or close, or its low above them. |
| `W-CHART-EMPTY` | warning | `layout chart` with no prices | Nothing to plot. From the layout. |
| `W-CHART-MIXED` | warning | `candles` and `curve` in one chart | Curves need their own chart. From the layout. |
| `W-CHART-UNPLACED` | warning | a node with no `at bar,price` in a chart | Drawn underneath the chart. From the layout. |
| `E-BAD-OVERRIDE` | error | `inkling render x.inkling --paper notbook` | A setting passed to the command line or `renderDiagram` options is not valid. From `inkling-node`. |
| `E-INTERNAL` | error | a bug in Inkling | `render` caught a crash and drew an empty page instead. |

Every code except `E-INTERNAL` has a test that triggers it. `tests/errors.test.ts` checks this: it fails if a code is used in `src` but missing here, listed here but no longer used, or never triggered by a test. Adding a code means adding a row here and a test.
