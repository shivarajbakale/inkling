# The Inkling language, version 1

This is the reference for what Inkling source means. The playground's Syntax
page shows the same statements by example; this page gives the exact rules.
`tests/language-spec.test.ts` checks that every keyword, shape, option, layout,
arrow, reserved word and deprecated word in the parser appears here, so this
page can't fall behind the parser.

## The 1.x promise

**Any source that parses without errors in Inkling 1.0 parses the same way,
without errors, in every 1.x release.**

- *The same way* means the same `Doc`: the same nodes, arrows, labels, groups,
  marks, steps and settings. `tests/compat/1.0/` holds a corpus of sources and
  their parsed `Doc`s. Every 1.x release must reproduce them; files in it are
  never edited, only added.
- **Drawings may change.** Layouts, arrow routing, label placement, fonts and
  the pen can improve in any release, so the same source can draw a little
  differently. The meaning of the text can't change.
- **New statements may be added** in minor releases. They use words that were
  unused or reserved, so no 1.0 file changes meaning.
- **Warnings may be added.** A file that was clean may get a new warning, never a
  new error.
- **Deprecation.** A statement or word can be renamed in 1.x. The old form keeps
  working for all of 1.x and gives a `W-DEPRECATED` warning with a one-click fix.
  It can be removed only in Inkling 2.
- **Version line.** `inkling 1` (optional, first line) says the file is
  written for version 1. A file that says `inkling 2` or later is refused with
  `E-VERSION-TOO-NEW`, so an old renderer never draws a new file wrong.

## Files and lines

- Source is UTF-8 text. Inkling is line-based: one statement per line, except
  that groups and frames span lines between `{` and `}`.
- Blank lines are ignored. `#` starts a comment when it begins a line or follows
  a space; it runs to the end of the line. (`a#b` is a name, not a comment.)
- Indentation is ignored, except before bullets, where two spaces make one
  level.
- A problem on one line never changes how other lines are read. A line with an
  error is skipped; a warning still draws.

## Tokens

| Token | Form | Examples |
| --- | --- | --- |
| name | a letter or `_`, then letters, digits and `_`, with single `-` between parts | `api`, `load_balancer`, `step-2` |
| quoted name or text | `"…"`; `\"` is a quote, `\\` a backslash, `\n` a line break | `"Load balancer"`, `"Orders\nDB"` |
| number | digits, with an optional decimal part | `7`, `0.45`, `104.5` |
| arrow | `->`, `-->`, `~>`, `<->`, `<~>` | |
| punctuation | `:` `,` `=` `{` `}` `..` `@n` (a step number) `-` (a bullet, first on its line) | |

Any other run of characters is a *word*: allowed only where a statement says so
(labels after `:` on an arrow, chart numbers, `!` after a compare cell, `&`
between set names).

## Keywords and names

A line is a **statement** when its first token is a keyword and the next token
is not `:` and not an arrow. Otherwise the first token is a name. So every
keyword still works as a node name:

```inkling
loop: box "Event loop"     # a node called loop
loop -> set                # an arrow between two nodes
circle loop                # a mark on it
```

Keywords: `title`, `layout`, `direction`, `paper`, `pen`, `hand`, `mess`,
`seed`, `steps`, `inkling`, `root`, `center`, `footer`, `colors`, `gap`,
`branches`, `step`, `group`, `cycle`, `columns`, `row`, `span`, `brace`,
`activate`, `deactivate`, `start`, `final`, `set`, `quadrants`, `loop`, `opt`,
`alt`, `par`, `else`, `and`, `candles`, `prices`, `line`, `curve`, `level`,
`zone`, `buy`, `sell`, `stop`, `target`, `trend`, `axis`, `xlabels`, `circle`,
`underline`, `strike`, `highlight`, `note`, `cross`, `check`.

**Reserved words**, saved for later versions: `import`, `use`, `style`, `class`,
`link`, `theme`, `if`, `include`, `define`. As the first word of a statement
they give `E-RESERVED` and the line is skipped. They still work as names
(`link: box`, `a -> style`).

**Deprecated words**: `brace` is the old name for `span` (since 1.0). It
works everywhere `span` does and gives `W-DEPRECATED`.

## Statements

In the forms below, `name` is a name or quoted name, `"text"` is quoted text,
`[…]` is optional and `…` repeats.

### Settings

One per line, anywhere in the file. A later line wins.

```
title "text"
layout flow | free | stack | cycle | timeline | compare | mindmap | sequence | chart | tree | state | venn | quadrant
layout right | down            # shorthand for direction
direction right | down
paper notebook | graph | whiteboard | napkin | blank | chalkboard | blueprint
pen ballpoint | marker | pencil | felt | chalk
hand caveat | kalam | patrick | gochi | architect
mess <number 0..1>
seed <whole number>
steps auto
inkling 1
```

Layout-only settings: `root name` and `colors on|off` (mindmap), `center "text"`
(cycle), `footer on|off` (sequence), `gap <0..200>` (stack), `branches elbow|straight`
(tree).

Defaults: `layout flow`, `direction right`, `paper notebook`, `pen ballpoint`,
`hand caveat`, `mess 0.45`, `seed 7`.

### Nodes

```
name: [shape] ["label"] [fill] [option=value …] [place] [in …]
name: icon <icon> ["label"] …
```

- Shapes: `box` (default), `round`, `circle`, `diamond`, `cloud`, `db`,
  `sticky`, `person`, `icon`, `text`, `dot`, `bullseye`. Other names for them:
  `rect`, `rectangle`, `square` (box), `pill` (round), `oval`, `ellipse` (circle),
  `decision` (diamond), `database`, `cylinder` (db), `note` (sticky), `stick`,
  `user` (person), `label` (text).
- The label defaults to the name with `-` and `_` read as spaces. `dot` and
  `bullseye` have no label by default.
- Fill: a colour name, `yellow`, `pink`, `green`, `blue`, `orange`, `purple`,
  `red`, `gray`, written alone or as `fill=`.
- Options: `color=` (ink: `red`, `blue`, `green`, `orange`, `purple`, `black`,
  `gray`, `pink`), `pen=`, `size=` (`small`, `normal`, `large`), `fill=`,
  `icon=`, `gap=` (pixels, with a place).
- Place (free and chart layouts): `at x,y`, `below name`, `above name`,
  `left of name`, `right of name`. In a chart, `at bar,price`. In a quadrant,
  `at x,y` from 0 to 1, with 0,0 at the bottom left.
- `in a & b` (venn) or `in "Square"` (quadrant) says where an item belongs.
- Defining a name twice is `E-DUPLICATE-NODE`; the later line wins.

### Arrows

```
name arrow name [arrow name …] [: label] [color=…] [pen=…]
```

- `->` solid, `-->` dashed, `~>` squiggly, `<->` and `<~>` both ways.
- A chain makes one arrow per pair; the label goes on the last one.
- The label is quoted text, or the rest of the line before any options.
- Names not defined anywhere become boxes.

### Bullets

```
- text [as name]
```

Each bullet is a node; indenting two spaces makes it a child of the bullet
above. The name is `as name`, or made from the text (`Moon landing` becomes
`moon-landing`). How children draw depends on the layout. In flow, free and
state, a child gets an arrow from its parent. In timeline, `- date: text`
splits off the date. In venn and quadrant, a trailing ` in …` or ` at x,y` is
read as a node's.

### Groups

```
group name ["label"] {
  …lines…
}
group name ["label"] { name, name, … }
```

A node defined inside a group, or a new name first used in an arrow inside it,
belongs to it. Groups nest one level (a group inside a group). A `}` line closes
the innermost open group or frame.

### Marks

```
circle | underline | strike | highlight | cross | check  target [colour] [@step]
note target "text" [colour] [@step]
```

The target is a node, a group, an arrow (`a -> b`), a compare cell
(`row.column`) or, in a venn, an overlap (`dogs&cats`, `highlight` and `circle`
only). `underline` and `strike` on an arrow need a labelled arrow.

### Steps

```
step <n>[:] name, name, … ["caption"]
steps auto
```

Steps reveal the drawing in order. A step can name nodes and groups. Arrows
appear once both ends are visible. `steps auto` makes each node its own step and
is ignored when the file has `step` lines.

### Layout statements

| Statement | Layout | Form |
| --- | --- | --- |
| `cycle` | cycle | `cycle a, b, c [counterclockwise]` |
| `span` | timeline, stack | `span first..last ["label"]`: a bracket over a run of events or layers |
| `columns`, `row` | compare | `columns "A", "B"` then `row "Label": yes, no, partly, "text"`, `!` after a cell circles it |
| `activate`, `deactivate` | sequence | `activate name` |
| `note over` | sequence | `note over a[, b] "text"` |
| `loop`, `opt`, `alt`, `par` | sequence | `loop ["condition"] {` … `}`; `} else ["label"] {` in `alt`; `} and {` in `par`; three deep |
| `start`, `final` | state (any layout) | `start name`, `final name`: a dot before, a bullseye after |
| `set` | venn | `set name ["label"]`, two or three |
| `quadrants` | quadrant | `quadrants "top left", "top right", "bottom left", "bottom right"` |
| `axis` | chart, quadrant | `axis x\|y "label" [low..high]` |
| `candles` | chart | `candles open high low close, …` |
| `prices` | chart | `prices 100 101 …` |
| `line`, `curve` | chart | `line ["label"] [colour] 100 101 …`, `curve ["label"] x,y x,y …` |
| `level`, `stop`, `target` | chart | `level 104 ["label"] [colour]` |
| `zone` | chart | `zone 98..100 ["label"] [colour]` |
| `buy`, `sell` | chart | `buy <bar> <price> ["label"]`, bars count from 1 |
| `trend` | chart | `trend <bar> <price> <bar> <price> ["label"]` |
| `xlabels` | chart | `xlabels Mon Tue "Wed night" …` |

A layout statement in another layout is read but not drawn, with
`W-WRONG-LAYOUT`. A frame outside a sequence is `E-FRAME-LAYOUT`.

## Diagnostics

Every problem has a stable code, listed in [errors.md](errors.md). Codes are part
of the 1.x promise: a code is never reused for a different problem.
