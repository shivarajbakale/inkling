/**
 * The language reference: what to write and what it does. The playground's
 * Syntax page shows these rows, and editor hover looks words up in them, so
 * the two never disagree.
 *
 * Each row's `keys` say which words it explains:
 *   kw:<word>      a statement's first word (kw:circle, kw:note over)
 *   shape:<name>   a shape after `id:`
 *   opt:<name>     a key=value option
 *   layout:<name>  a value of `layout`
 *   arrow:<arrow>  an arrow
 */
export interface ReferenceRow {
  code: string;
  what: string;
  keys: string[];
}

export interface ReferenceGroup {
  group: string;
  rows: ReferenceRow[];
}

const row = (code: string, what: string, keys: string[] = []): ReferenceRow => ({ code, what, keys });

export const SHAPE_WORDS = ['box', 'round', 'circle', 'diamond', 'cloud', 'db', 'sticky', 'person', 'text', 'dot', 'bullseye', 'rect', 'rectangle', 'square', 'pill', 'oval', 'ellipse', 'decision', 'database', 'cylinder', 'note', 'stick', 'user', 'label'];

export const REFERENCE: ReferenceGroup[] = [
  {
    group: 'Things',
    rows: [
      row('api: box "API"', 'A node. Shapes: box, round, circle, diamond, cloud, db, sticky, person, text, dot, bullseye. Also rect, square, ellipse, database.', SHAPE_WORDS.map((s) => `shape:${s}`)),
      row('"Load balancer" -> api', 'Put a name in quotes to use spaces.'),
      row('api: box "API" yellow', 'Add a colour to fill it with pencil hatching.'),
      row(
        'api: icon server "API"',
        'An icon instead of a shape: person, server, database, cloud, phone, laptop, lock, key, mail, file, folder, gear, chart, globe, clock, bell, cart, card, chat, search, star, heart, bolt, bug, rocket, book, camera, code, link, check.',
        ['shape:icon', 'opt:icon'],
      ),
      row('api: box "API" color=red pen=marker size=large', 'Options: ink color (red, blue, green, orange, purple, pink, gray, black), pen, size (small, normal, large), fill, icon.', ['opt:color', 'opt:pen', 'opt:size', 'opt:fill']),
      row('db: db "Orders\\nDB"', '\\n breaks a label onto two lines.'),
    ],
  },
  {
    group: 'Arrows',
    rows: [
      row('a -> b', 'A plain arrow. Names you have not defined become boxes.', ['arrow:->']),
      row('a --> b', 'Dashed, for replies and optional paths.', ['arrow:-->']),
      row('a ~> b', 'Squiggly, for "asks around" or "eventually".', ['arrow:~>']),
      row('a <-> b', 'Both ways. <~> is both ways and squiggly.', ['arrow:<->', 'arrow:<~>']),
      row('a -> b -> c : "label"', 'Chain arrows. The label goes on the last one.'),
      row('a -> b : "label" color=red', 'Arrows take color and pen options too.'),
    ],
  },
  {
    group: 'Marks a teacher would make',
    rows: [
      row('circle api', 'Loops around a node. The pen overshoots where it starts.', ['kw:circle']),
      row('underline api', 'Two quick strokes under the label.', ['kw:underline']),
      row('strike api', 'Crosses the label out.', ['kw:strike']),
      row('highlight api pink', 'A highlighter swipe. Yellow unless you name a colour.', ['kw:highlight']),
      row('note api "slow!"', 'A margin note with an arrow. It finds free space.', ['kw:note']),
      row('check api / cross api', 'A tick or a cross on the corner.', ['kw:check', 'kw:cross']),
      row('circle api @3', 'Draws the mark during step 3 instead of with the node.'),
      row('circle api -> db', 'Marks work on arrows too: circle, note, highlight, check, cross, and underline or strike for labelled arrows.'),
      row('circle backend', 'And on groups.'),
    ],
  },
  {
    group: 'Grouping',
    rows: [
      row('group backend "Backend" {', 'Start a group. Nodes defined inside, and new names used in arrows inside, belong to it. End with a } line.', ['kw:group']),
      row('group edge "Edge" { cdn, lb }', 'Or list members on one line.'),
      row('group inner { … } inside a group', 'Groups can sit inside one other group.'),
    ],
  },
  {
    group: 'Layouts',
    rows: [
      row('layout flow', 'Boxes and arrows, ranked automatically (the default). direction right or down.', ['layout:flow']),
      row('- Item\n  - Child as id', 'Outline bullets work in every layout. Indent two spaces per level; "as" names the node.'),
      row('layout free', 'You place things: a: box at 200,120, b: box below a, c: box right of a gap=80.', ['layout:free', 'opt:gap']),
      row('layout stack', 'Bullets become layers top to bottom; children sit inside. direction right makes a pipeline. span a..b "label" draws a bracket beside a run of layers. gap 10.', ['layout:stack', 'kw:gap']),
      row('layout cycle', 'cycle a, b, c, d puts them round a circle with arrows; add counterclockwise to turn the other way. center "text".', ['layout:cycle', 'kw:cycle', 'kw:center']),
      row('layout timeline', '- 1969: Moon landing. Number or ISO dates are spaced to scale; long gaps get a break. span a..b "label" brackets a stretch of time. direction down.', ['layout:timeline']),
      row('span a..b "label"', 'A bracket over a run of things, with a label: dates on a timeline, layers in a stack. brace is the old name for it.', ['kw:span', 'kw:brace']),
      row('layout compare', 'columns "A", "B", then row "Label": yes, no, partly, "text". A ! after a cell circles it. Cells are named row.column.', ['layout:compare', 'kw:columns', 'kw:row']),
      row('layout mindmap', 'The first bullet is the centre. colors on gives each branch its own ink. root x picks the centre for arrows. direction down makes an org chart.', ['layout:mindmap', 'kw:colors', 'kw:root']),
      row('layout sequence', 'Nodes are participants left to right; arrows are messages top to bottom. activate x / deactivate x. footer off.', ['layout:sequence', 'kw:activate', 'kw:deactivate', 'kw:footer']),
      row('loop "every 5s" {\n  a -> b\n}', 'Sequence frames box messages in: loop, opt, alt and par, with an optional "condition". Up to three deep.', ['kw:loop', 'kw:opt']),
      row('alt "ok" {\n  …\n} else "error" {\n  …\n}', 'alt takes any number of else branches; par takes and branches:  par { … } and { … }', ['kw:alt', 'kw:else', 'kw:par', 'kw:and']),
      row('note over a, b "text"', 'In a sequence: a note card centred on one lifeline, or spanning two.', ['kw:note over']),
      row('layout tree', 'A hierarchy, such as an org chart. Bullets or arrows; several roots draw side by side. direction right grows sideways. branches straight for direct lines.', ['layout:tree', 'kw:branches']),
      row('layout state', 'A state machine. States are round boxes; arrows are transitions with a label such as "click [ok] / save". Groups are composite states.', ['layout:state']),
      row('layout venn', 'set dogs "Dogs" declares a circle (two or three). Items say where they belong:  - Fur in dogs & cats. Items with no in sit outside.', ['layout:venn', 'kw:set']),
      row('highlight dogs&cats', 'In a venn, highlight or circle an overlap by joining set names with &.'),
      row('layout quadrant', 'A 2×2 grid. axis x "Effort" low..high, axis y "Impact" low..high, quadrants "A", "B", "C", "D" (top left, top right, bottom left, bottom right).', ['layout:quadrant', 'kw:quadrants', 'kw:axis']),
      row('- Dark mode at 0.2,0.8\n- Rewrite in "Money pit"', 'Quadrant items: at x,y from 0 to 1 (0,0 is bottom left), or in a named square.'),
      row('start idle\nfinal done', 'A filled dot with an arrow into idle, and a bullseye after done. Also shapes on their own: s: dot, e: bullseye.', ['kw:start', 'kw:final']),
      row('layout chart', 'Prices and the marks traders draw. candles open high low close, … · prices 100 102 101 … · line "50-day" orange 99 100 … · xlabels Mon Tue …', ['layout:chart', 'kw:candles', 'kw:prices', 'kw:line', 'kw:xlabels']),
      row('level 104 "resistance"\nzone 98..100 "support"', 'A dashed line, or a hatched band, across the chart. Add a colour name after the label.', ['kw:level', 'kw:zone']),
      row('buy 8 105 "breakout"\nstop 102.5\ntarget 112.5', 'An arrow at bar 8 (bars count from 1) and price 105; sell points down. Stop and target lines run from the trade, with the reward to risk.', ['kw:buy', 'kw:sell', 'kw:stop', 'kw:target']),
      row('trend 2 99 9 106 "uptrend"', 'A ruler line through two bar, price points.', ['kw:trend']),
      row('curve "long call" 80,-5 100,-5 130,25', 'x,y points on a number line instead of bars: payoff diagrams. axis x "price" and axis y "profit" name the axes.', ['kw:curve']),
      row('gap: text "gap up" at 5,108', 'In a chart, at means bar,price, so circles, highlights and notes can point at the chart.'),
    ],
  },
  {
    group: 'Telling it as a story',
    rows: [
      row('steps auto', 'Every node becomes its own step, in the order you wrote them.', ['kw:steps']),
      row('step 2: backend', 'A step can name a group: all of its members appear then.'),
      row('step 1: a, b "caption"', 'Reveal order. Arrows appear once both ends exist.', ['kw:step']),
      row('title "How X works"', 'A handwritten heading with an underline.', ['kw:title']),
    ],
  },
  {
    group: 'The look',
    rows: [
      row('paper notebook', 'notebook, graph, whiteboard, napkin, blank, chalkboard, blueprint.', ['kw:paper']),
      row('pen ballpoint', 'ballpoint, marker, pencil, felt, chalk.', ['kw:pen']),
      row('hand caveat', 'caveat, kalam, patrick, gochi, architect.', ['kw:hand']),
      row('mess 0.4', '0 is tidy, 1 is chaotic. Moves nodes, tilts them, wobbles letters.', ['kw:mess']),
      row('seed 7', 'The same seed always draws the same wobble.', ['kw:seed']),
      row('layout down', 'right (default) or down.', ['kw:direction', 'layout:right', 'layout:down']),
      row('inkling 1', 'Optional first line: the language version this file is written for.', ['kw:inkling']),
    ],
  },
];

/** The row that explains `key` (such as kw:circle or shape:box), if any. */
export function lookup(key: string): ReferenceRow | undefined {
  for (const g of REFERENCE) for (const r of g.rows) if (r.keys.includes(key)) return r;
  return undefined;
}
