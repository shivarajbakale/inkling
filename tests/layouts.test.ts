import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkScene, format, layout, parse, render } from '../src/core';
import { segmentHitsBox } from '../src/core/humanise';

const scene = (src: string) => layout(parse(src));

describe('free', () => {
  it('puts nodes exactly where asked, relative ones next to their anchor', () => {
    const s = scene('layout free\na: box "A" at 100,100\nb: box "B" below a gap=50\nc: box "C" right of a');
    const a = s.nodes.get('a')!;
    const b = s.nodes.get('b')!;
    const c = s.nodes.get('c')!;
    expect(b.cx).toBeCloseTo(a.cx, 5);
    expect(b.cy - b.h / 2 - (a.cy + a.h / 2)).toBeCloseTo(50, 5);
    expect(c.cy).toBeCloseTo(a.cy, 5);
    expect(c.cx).toBeGreaterThan(a.cx + a.w / 2);
  });

  it('reports loops and unplaced nodes', () => {
    const codes = render('layout free\na: box below b\nb: box below a\nc: box').doc.diagnostics.map((d) => d.code);
    expect(codes).toContain('W-PLACE-LOOP');
    expect(codes).toContain('W-UNPLACED');
  });

  it('needs "of" for left and right', () => {
    expect(parse('a: box right a').diagnostics.map((d) => d.code)).toContain('E-BAD-PLACE');
  });
});

describe('stack', () => {
  it('stacks layers top to bottom with children inside', () => {
    const s = scene('layout stack\n- Top\n  - A\n  - B\n- Bottom');
    const top = s.nodes.get('top')!;
    const bottom = s.nodes.get('bottom')!;
    expect(bottom.cy).toBeGreaterThan(top.cy);
    expect(top.w).toBeCloseTo(bottom.w, 5);
    const a = s.nodes.get('a')!;
    expect(a.cy).toBeGreaterThan(top.cy - top.h / 2);
    expect(a.cy).toBeLessThan(top.cy + top.h / 2);
  });

  it('turns sideways with direction right, and draws braces', () => {
    const s = scene('layout stack\ndirection right\n- A\n- B\nbrace a..b "both"');
    expect(s.nodes.get('b')!.cx).toBeGreaterThan(s.nodes.get('a')!.cx);
    expect(s.decorations.some((d) => d.kind === 'brace')).toBe(true);
  });
});

describe('cycle', () => {
  it('goes clockwise from the top, and makes the closing arrow', () => {
    const d = parse('layout cycle\ncycle a, b, c, d');
    expect(d.edges.map((e) => `${e.from}${e.to}`)).toEqual(['ab', 'bc', 'cd', 'da']);
    const s = layout(d);
    const [a, b, c] = ['a', 'b', 'c'].map((id) => s.nodes.get(id)!);
    expect(a.cy).toBeLessThan(c.cy);
    expect(b.cx).toBeGreaterThan(a.cx);
    expect(s.edges.every((e) => e.fixed && e.points.length > 3)).toBe(true);
  });

  it('turns the other way when asked', () => {
    const s = scene('layout cycle\ncycle a, b, c, d counterclockwise');
    expect(s.nodes.get('b')!.cx).toBeLessThan(s.nodes.get('a')!.cx);
  });
});

describe('timeline', () => {
  it('spaces numeric dates to scale and shortens long gaps', () => {
    const s = scene('layout timeline\n- 1900: A\n- 1901: B\n- 1902: C\n- 2000: D');
    const xs = ['1900', '1901', '1902', '2000'].map((id) => s.nodes.get(id)!.cx);
    expect(xs[1]).toBeGreaterThan(xs[0]);
    expect(xs[3] - xs[2]).toBeLessThan(5 * (xs[2] - xs[1]));
    expect(s.decorations.some((d) => d.kind === 'zigzag')).toBe(true);
  });

  it('keeps written order when dates are not numbers, and alternates sides', () => {
    const s = scene('layout timeline\n- Mon: A\n- Tue: B\n- Wed: C');
    const [a, b, c] = ['mon', 'tue', 'wed'].map((id) => s.nodes.get(id)!);
    expect(a.cx).toBeLessThan(b.cx);
    expect(b.cx).toBeLessThan(c.cx);
    expect(Math.sign(a.cy - b.cy)).not.toBe(0);
    expect(a.cy).toBeCloseTo(c.cy, 0);
  });
});

describe('compare', () => {
  it('reads columns and rows into cells with ids', () => {
    const d = parse('layout compare\ncolumns "SQL", "NoSQL"\nrow "Joins": yes, no!\nhighlight joins.sql');
    expect(d.nodes.map((n) => n.id)).toEqual(['sql', 'nosql', 'joins', 'joins.sql', 'joins.nosql']);
    expect(d.nodes.find((n) => n.id === 'joins.nosql')!.cell).toMatchObject({ mark: 'no', win: true });
    expect(d.diagnostics).toEqual([]);
  });

  it('reports rows with the wrong number of cells', () => {
    expect(parse('layout compare\ncolumns a, b\nrow "x": yes').diagnostics.map((d) => d.code)).toContain('E-ROW-CELLS');
  });

  it('puts cells in a grid', () => {
    const s = scene('layout compare\ncolumns "A", "B"\nrow "One": "1", "2"\nrow "Two": "3", "4"');
    expect(s.nodes.get('one.a')!.cx).toBeCloseTo(s.nodes.get('two.a')!.cx, 5);
    expect(s.nodes.get('one.a')!.cy).toBeCloseTo(s.nodes.get('one.b')!.cy, 5);
  });
});

describe('mindmap', () => {
  it('splits branches between both sides and styles by level', () => {
    const s = scene('layout mindmap\n- Root\n  - A\n    - A1\n  - B\n  - C\n  - D');
    const root = s.nodes.get('root')!;
    const sides = ['a', 'b', 'c', 'd'].map((id) => Math.sign(s.nodes.get(id)!.cx - root.cx));
    expect(sides).toContain(1);
    expect(sides).toContain(-1);
    expect(s.defs!.get('root')!.shape).toBe('cloud');
    expect(s.defs!.get('a')!.shape).toBe('round');
    expect(s.defs!.get('a1')!.shape).toBe('text');
    expect(s.decorations.filter((d) => d.kind === 'branch')).toHaveLength(5);
  });

  it('builds the tree from arrows when there are no bullets', () => {
    const s = scene('layout mindmap\nroot hub\nhub -> a\nhub -> b');
    expect(s.edges.every((e) => e.style === 'hidden')).toBe(true);
  });
});

describe('sequence', () => {
  it('puts messages top to bottom in source order without overlapping', () => {
    const s = scene('layout sequence\na: box\nb: box\nc: box\na -> b : "one"\nb -> c : "two"\nc --> a : "three"\nb -> b : "self"');
    const ys = s.edges.map((e) => e.points[0][1]);
    expect([...ys].sort((p, q) => p - q)).toEqual(ys);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThan(15);
    expect(s.decorations.filter((d) => d.kind === 'line' && d.dashed)).toHaveLength(3);
  });

  it('makes one step per message with steps auto', () => {
    const { drawing } = render('layout sequence\nsteps auto\na -> b\nb -> a\na -> b', {}, { idPrefix: 's' });
    expect(drawing.steps.map((s) => s.index)).toEqual([1, 2, 3, 4]);
  });
});

describe('tree', () => {
  it('lines up each level and centres parents over their children', () => {
    const s = scene('layout tree\n- Root\n  - A\n    - A1\n    - A2\n  - Bee bee\n- Other');
    const n = (id: string) => s.nodes.get(id)!;
    expect(n('a').cy).toBeCloseTo(n('bee-bee').cy, 5);
    expect(n('a1').cy).toBeGreaterThan(n('a').cy);
    expect(n('a').cx).toBeCloseTo((n('a1').cx + n('a2').cx) / 2, 5);
    expect(n('root').cx).toBeCloseTo((n('a').cx + n('bee-bee').cx) / 2, 5);
    // Two roots: a forest, side by side on the top row.
    expect(n('other').cy).toBeCloseTo(n('root').cy, 5);
    expect(n('other').cx).toBeGreaterThan(n('bee-bee').cx);
    expect(checkScene(s).filter((p) => p.kind === 'node-overlap')).toEqual([]);
  });

  it('grows sideways with direction right', () => {
    const s = scene('layout tree\ndirection right\n- Root\n  - A\n  - B');
    expect(s.nodes.get('a')!.cx).toBeGreaterThan(s.nodes.get('root')!.cx);
    expect(s.nodes.get('a')!.cx).toBeCloseTo(s.nodes.get('b')!.cx, 5);
  });

  it('draws plain arrows as branches, and keeps labelled ones', () => {
    const s = scene('layout tree\na -> b\na -> c : "boss of"\nb ~> c');
    expect(s.edges.map((e) => e.style)).toEqual(['hidden', 'arrow', undefined]);
    expect(s.decorations.filter((d) => d.kind === 'line' && d.straight).length).toBeGreaterThan(0);
    const straight = scene('layout tree\nbranches straight\na -> b\na -> c');
    expect(straight.decorations.filter((d) => d.kind === 'line' && !d.straight)).toHaveLength(2);
  });

  it('reports a loop and still draws', () => {
    const { doc } = render('layout tree\na -> b\nb -> a', {}, { idPrefix: 't' });
    expect(doc.diagnostics.map((d) => d.code)).toContain('E-TREE-CYCLE');
    expect(doc.diagnostics.map((d) => d.code)).not.toContain('E-INTERNAL');
  });
});

describe('state', () => {
  it('adds start and final dots with arrows', () => {
    const doc = parse('layout state\nstart idle\nidle -> busy\nfinal busy');
    expect(doc.nodes.find((n) => n.id === 'start-idle')!.shape).toBe('dot');
    expect(doc.nodes.find((n) => n.id === 'final-busy')!.shape).toBe('bullseye');
    expect(doc.edges.map((e) => `${e.from}>${e.to}`)).toEqual(['start-idle>idle', 'idle>busy', 'busy>final-busy']);
  });

  it('makes states round and ranks from the start', () => {
    const s = scene('layout state\nbusy -> idle\nstart idle\nidle -> busy');
    expect(s.defs!.get('idle')!.shape).toBe('round');
    expect(s.nodes.get('start-idle')!.cx).toBeLessThan(s.nodes.get('idle')!.cx);
  });

  it('keeps a self-loop label clear of its state', () => {
    const s = scene('layout state\nstart a\na -> a : "tick"');
    const n = s.nodes.get('a')!;
    const label = s.labels.get('edge:1')!;
    const box = { x: n.cx - n.w / 2, y: n.cy - n.h / 2, w: n.w, h: n.h };
    const overlap = Math.min(label.box.x + label.box.w, box.x + box.w) > Math.max(label.box.x, box.x) && Math.min(label.box.y + label.box.h, box.y + box.h) > Math.max(label.box.y, box.y);
    expect(overlap).toBe(false);
  });

  it('steps breadth-first from the start', () => {
    const { drawing } = render('layout state\nsteps auto\nstart a\na -> b\na -> c\nb -> d', {}, { idPrefix: 's' });
    expect(drawing.steps.length).toBe(4);
  });
});

describe('sequence frames', () => {
  const src = 'layout sequence\na -> b : "one"\nloop "again" {\n  b -> a : "two"\n  alt "ok" {\n    a -> b : "three"\n  } else "no" {\n    a -> b : "four"\n  }\n}\nnote over a, b "both"';

  it('parses kinds, branches and nesting', () => {
    const doc = parse(src);
    expect(doc.diagnostics).toEqual([]);
    expect(doc.frames.map((f) => [f.kind, f.depth, f.branches.map((b) => b.label)])).toEqual([
      ['loop', 0, ['again']],
      ['alt', 1, ['ok', 'no']],
    ]);
    expect(doc.annotations[0].over).toEqual(['a', 'b']);
  });

  it('boxes nested frames inside their parents, round their messages', () => {
    const s = scene(src);
    const frames = s.decorations.filter((d) => d.kind === 'box' && d.frame).map((d) => (d as { box: { x: number; y: number; w: number; h: number } }).box);
    expect(frames).toHaveLength(2);
    const [inner, outer] = frames;
    expect(inner.x).toBeGreaterThan(outer.x);
    expect(inner.x + inner.w).toBeLessThan(outer.x + outer.w);
    expect(inner.y).toBeGreaterThan(outer.y);
    expect(inner.y + inner.h).toBeLessThan(outer.y + outer.h);
    const y3 = s.edges[2].points[0][1];
    expect(y3).toBeGreaterThan(inner.y);
    expect(y3).toBeLessThan(inner.y + inner.h);
    expect(s.edges[0].points[0][1]).toBeLessThan(outer.y);
    expect(s.labels.get('note:0')!.card).toBe(true);
  });

  it('formats } else lines at the frame indent', () => {
    expect(format('alt {\na -> b\n} else {\na -> b\n}\n')).toBe('alt {\n  a -> b\n} else {\n  a -> b\n}\n');
  });
});

describe('venn', () => {
  it('puts every item inside exactly its own region', () => {
    const s = scene('layout venn\nset a "A"\nset b "B"\nset c "C"\n- One in a\n- Two in a & b\n- Three in a & b & c\n- Four in c\n- Five');
    const discs = s.decorations.filter((d) => d.kind === 'disc') as { cx: number; cy: number; r: number }[];
    expect(discs).toHaveLength(3);
    const inside = (id: string) => {
      const n = s.nodes.get(id)!;
      return discs.map((c) => [n.cx - n.w / 2, n.cx + n.w / 2].every((x) => [n.cy - n.h / 2, n.cy + n.h / 2].every((y) => Math.hypot(x - c.cx, y - c.cy) < c.r)));
    };
    expect(inside('one')).toEqual([true, false, false]);
    expect(inside('two')).toEqual([true, true, false]);
    expect(inside('three')).toEqual([true, true, true]);
    expect(inside('four')).toEqual([false, false, true]);
    expect(discs.every((c) => Math.hypot(s.nodes.get('five')!.cx - c.cx, s.nodes.get('five')!.cy - c.cy) > c.r)).toBe(true);
  });

  it('reads items written as nodes, and marks on overlaps', () => {
    const s = scene('layout venn\nset a\nset b\nfur: "Fur" in a&b\nhighlight a&b\ncircle a&b');
    expect(s.decorations.some((d) => d.kind === 'region')).toBe(true);
    expect(s.decorations.some((d) => d.kind === 'ring')).toBe(true);
  });
});

describe('quadrant', () => {
  it('puts dots exactly at 0..1 positions, bottom left first', () => {
    const s = scene('layout quadrant\nquadrants "A", "B", "C", "D"\n- Low at 0,0\n- High at 1,1\n- Middle in "B"');
    const dots = s.decorations.filter((d) => d.kind === 'disc') as { cx: number; cy: number }[];
    const [low, high, mid] = dots;
    expect(high.cx - low.cx).toBeCloseTo(520, 5);
    expect(low.cy - high.cy).toBeCloseTo(440, 5);
    expect(mid.cx).toBeGreaterThan((low.cx + high.cx) / 2);
    expect(mid.cy).toBeLessThan((low.cy + high.cy) / 2);
  });
});

describe('every mark works in every layout', () => {
  const sources: Record<string, string> = {
    flow: 'a -> b',
    free: 'layout free\na: box at 50,50\nb: box right of a\na -> b',
    stack: 'layout stack\n- A\n- B\na -> b',
    cycle: 'layout cycle\ncycle a, b, c',
    timeline: 'layout timeline\n- 1: A as a\n- 2: B as b\na -> b',
    compare: 'layout compare\ncolumns "A", "B"\nrow "R": yes, no',
    mindmap: 'layout mindmap\n- Root as a\n  - B as b',
    sequence: 'layout sequence\na -> b',
    tree: 'layout tree\na -> b\na -> c',
    state: 'layout state\nstart a\na -> b',
    venn: 'layout venn\nset s\nset t\n- A in s as a',
    quadrant: 'layout quadrant\n- A at 0.5,0.5 as a',
  };
  const target = (name: string) => (name === 'compare' ? 'a' : 'a');
  for (const [name, src] of Object.entries(sources))
    for (const mark of ['circle', 'underline', 'strike', 'highlight', 'check', 'cross', 'note']) {
      it(`${mark} in ${name}`, () => {
        const full = `${src}\n${mark} ${target(name)}${mark === 'note' ? ' "hi"' : ''}`;
        const { doc, drawing } = render(full, {}, { idPrefix: 'm' });
        expect(doc.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
        expect(drawing.svg.querySelectorAll('[data-ink-kind="mark"] path').length).toBeGreaterThan(0);
      });
    }
});

describe('fuzz: every layout survives random outlines', () => {
  it('renders, keeps nodes apart', () => {
    const LAYOUTS = ['flow', 'free', 'stack', 'cycle', 'timeline', 'mindmap', 'sequence', 'tree', 'state', 'venn', 'quadrant'];
    fc.assert(
      fc.property(
        fc.constantFrom(...LAYOUTS),
        fc.array(fc.tuple(fc.integer({ min: 0, max: 2 }), fc.constantFrom('Alpha', 'B', 'A much longer item', '1999', 'x\\ny')), { minLength: 1, maxLength: 14 }),
        fc.array(fc.tuple(fc.nat(), fc.nat()), { maxLength: 8 }),
        fc.boolean(),
        (name, items, arrows, down) => {
          const lines = [`layout ${name}`];
          if (down) lines.push('direction down');
          let prev = 0;
          items.forEach(([lvl, text], k) => {
            const level = Math.min(lvl, prev + 1);
            prev = level;
            lines.push(`${'  '.repeat(level)}- ${text} ${k} as n${k}`);
          });
          for (const [a, b] of arrows) lines.push(`n${a % items.length} -> n${b % items.length}`);
          if (name === 'cycle') lines.push(`cycle ${items.map((_, k) => `n${k}`).join(', ')}`);
          const src = lines.join('\n');
          const { doc } = render(src, {}, { idPrefix: 'z' });
          expect(doc.diagnostics.filter((d) => d.code === 'E-INTERNAL')).toEqual([]);
          expect(checkScene(layout(parse(src))).filter((p) => p.kind === 'node-overlap')).toEqual([]);
        },
      ),
      { numRuns: Number(process.env.FUZZ_RUNS ?? 300) },
    );
  });
});

describe('layout diagnostics', () => {
  const cases: [string, string][] = [
    ['E-EMPTY-BULLET', '- '],
    ['W-BULLET-INDENT', '    - floating'],
    ['E-BAD-CYCLE', 'cycle a'],
    ['W-SECOND-CYCLE', 'cycle a, b\ncycle c, d'],
    ['E-BAD-RANGE', 'a: box\nspan a'],
    ['E-BAD-SWITCH', 'colors maybe'],
    ['E-BAD-GAP', 'gap 900'],
    ['E-UNKNOWN-LAYOUT', 'layout spiral'],
    ['W-WRONG-LAYOUT', 'columns "A"\nrow "x": yes'],
    ['E-BAD-ARROW', 'a => b'],
    ['E-BAD-FRAME', 'layout sequence\nloop "x" extra {\na -> b\n}'],
    ['E-MISSING-COLON', 'api box "API"'],
    ['W-NEW-NAME', 'server: box\na -> serer'],
    ['E-BAD-CHART', 'layout chart\nbuy 105'],
    ['E-BAD-BRANCHES', 'branches curly'],
    ['E-BAD-START', 'start a b'],
    ['W-DUPLICATE-START', 'start a\nstart a'],
    ['E-FRAME-LAYOUT', 'loop {\na -> b\n}'],
    ['E-FRAME-TOO-DEEP', 'layout sequence\nloop {\nloop {\nloop {\nloop {\na -> b\n}\n}\n}\n}'],
    ['E-ELSE-WITHOUT-ALT', 'layout sequence\nloop {\na -> b\n} else {\na -> b\n}'],
    ['E-AND-WITHOUT-PAR', 'layout sequence\nalt {\na -> b\n} and {\na -> b\n}'],
    ['E-UNCLOSED-FRAME', 'layout sequence\nopt {\na -> b'],
    ['W-EMPTY-FRAME', 'layout sequence\na -> b\nopt {\n}'],
    ['E-VENN-TOO-MANY', 'layout venn\nset a\nset b\nset c\nset d'],
    ['E-UNKNOWN-SET', 'layout venn\nset dogs\n- Bark in dgos'],
    ['E-SET-TWICE', 'layout venn\nset a\n- X in a & a'],
    ['W-REGION-MARK', 'layout venn\nset a\nset b\nnote a&b "hi"'],
    ['E-BAD-QUADRANTS', 'quadrants "A", "B"'],
    ['E-QUADRANT-RANGE', 'layout quadrant\n- X at 1.4,0.2'],
    ['E-UNKNOWN-QUADRANT', 'layout quadrant\nquadrants "A", "B", "C", "D"\n- X in "E"'],
    ['E-BAD-IN', 'x: "X" in'],
    ['W-CANDLE', 'layout chart\ncandles 100 99 98 103'],
  ];
  for (const [code, src] of cases)
    it(code, () => {
      expect(parse(src).diagnostics.map((d) => d.code)).toContain(code);
    });

  const fromLayout: [string, string][] = [
    ['W-NO-CYCLE', 'layout cycle\na -> b'],
    ['W-NO-COLUMNS', 'layout compare\na: box'],
    ['W-MANY-ROOTS', 'layout mindmap\n- A\n- B'],
    ['E-TREE-CYCLE', 'layout tree\na -> b\nb -> c\nc -> a'],
    ['W-STATE-NO-START', 'layout state\na -> b'],
    ['W-VENN-SETS', 'layout venn\nset a'],
    ['W-QUADRANT-UNPLACED', 'layout quadrant\n- Nowhere'],
    ['W-STATE-UNREACHABLE', 'layout state\nstart a\na -> b\nc -> b'],
    ['W-CHART-EMPTY', 'layout chart\nlevel 3'.replace('level 3', '')],
    ['W-CHART-MIXED', 'layout chart\nprices 1 2 3\ncurve 1,2 3,4'],
    ['W-CHART-UNPLACED', 'layout chart\nprices 1 2 3\na: box "A"'],
    ['W-VENN-CROWDED', 'layout venn\nset a\nset b\n' + Array.from({ length: 40 }, (_, i) => `- A rather long overlapping item number ${i} in a & b`).join('\n')],
  ];
  for (const [code, src] of fromLayout)
    it(code, () => {
      expect(render(src, {}, { idPrefix: 'x' }).doc.diagnostics.map((d) => d.code)).toContain(code);
    });
});

describe('chart', () => {
  const src = [
    'layout chart',
    'candles 100 103 99 102, 102 104 100 101, 101 108 100.5 107',
    'line "avg" orange 100 101 102',
    'xlabels Mon Tue "Wed night"',
    'level 104 "resistance" red',
    'zone 98..100 "support"',
    'buy 3 105 "go"',
    'stop 102',
    'target 112',
    'trend 1 99 3 106 "up"',
    'axis y "price"',
    'spike: text "volume" at 3,109',
  ].join('\n');

  it('parses every chart statement', () => {
    const doc = parse(src);
    expect(doc.diagnostics).toEqual([]);
    const c = doc.chart;
    expect(c.candles).toEqual([[100, 103, 99, 102], [102, 104, 100, 101], [101, 108, 100.5, 107]]);
    expect(c.lines).toEqual([{ line: 3, label: 'avg', color: 'orange', values: [100, 101, 102] }]);
    expect(c.xlabels).toEqual(['Mon', 'Tue', 'Wed night']);
    expect(c.levels).toEqual([{ line: 5, label: 'resistance', color: 'red', price: 104 }]);
    expect(c.zones[0]).toMatchObject({ from: 98, to: 100, label: 'support' });
    expect(c.trades[0]).toMatchObject({ side: 'buy', bar: 3, price: 105, label: 'go' });
    expect(c.stops[0].price).toBe(102);
    expect(c.targets[0].price).toBe(112);
    expect(c.trends[0]).toMatchObject({ a: [1, 99], b: [3, 106], label: 'up' });
    expect(c.axis.y).toBe('price');
  });

  it('parses payoff curves with negative values', () => {
    const doc = parse('layout chart\ncurve "long call" 80,-5 100,-5 130,25');
    expect(doc.diagnostics).toEqual([]);
    expect(doc.chart.lines[0].points).toEqual([[80, -5], [100, -5], [130, 25]]);
  });

  it('leaves arrows and definitions named like chart words alone', () => {
    const doc = parse('stop: box "Stop"\nbuy -> stop');
    expect(doc.diagnostics).toEqual([]);
    expect(doc.edges).toHaveLength(1);
    expect(doc.chart.trades).toEqual([]);
  });

  it('puts higher prices higher, bars left to right, and nodes at bar,price', () => {
    const s = scene(src);
    const spike = s.nodes.get('spike')!;
    const textAt = (t: string) => s.decorations.find((d) => d.kind === 'text' && d.text === t) as { x: number; y: number };
    expect(textAt('Mon').x).toBeLessThan(textAt('Wed night').x);
    // The label for the 104 level sits above the stop at 102 and below the target at 112.
    expect(textAt('target 112').y).toBeLessThan(textAt('resistance').y);
    expect(textAt('resistance').y).toBeLessThan(textAt('stop 102').y);
    expect(textAt('reward : risk = 2.33 : 1')).toBeTruthy();
    expect(Math.abs(spike.cx - textAt('Wed night').x)).toBeLessThan(1);
    expect(checkScene(s).filter((p) => p.kind === 'node-overlap')).toEqual([]);
  });

  it('keeps right-hand labels apart when their prices are close', () => {
    const s = scene('layout chart\nprices 1 2 3\nlevel 2 "a"\nlevel 2.01 "b"\nlevel 2.02 "c"');
    const ys = s.decorations.filter((d) => d.kind === 'text' && ['a', 'b', 'c'].includes(d.text)).map((d) => (d as { y: number }).y).sort((a, b) => a - b);
    expect(ys[1] - ys[0]).toBeGreaterThan(10);
    expect(ys[2] - ys[1]).toBeGreaterThan(10);
  });

  it('describes the chart in words', () => {
    const { svg } = render(src).drawing;
    const desc = svg.querySelector('desc')!.textContent!;
    expect(desc).toContain('3 candles');
    expect(desc).toContain('Buy at bar 3, price 105: go.');
    expect(desc).toContain('Stop-loss at 102.');
  });
});

describe('big flow diagrams', () => {
  const big = import.meta.glob('./fixtures/big/*.inkling', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  // Arrows a single detour can't clear get more detours, one per node in the way.
  const through = (source: string) => {
    const scene = layout(parse(source));
    let n = 0;
    for (const e of scene.edges) {
      if (e.style === 'hidden') continue;
      for (const node of scene.nodes.values()) {
        if (node.def.id === e.def.from || node.def.id === e.def.to) continue;
        const box = { x: node.cx - node.w / 2 + 3, y: node.cy - node.h / 2 + 3, w: node.w - 6, h: node.h - 6 };
        if (e.points.slice(1).some((q, i) => segmentHitsBox(e.points[i], q, box))) n++;
      }
    }
    return n;
  };
  for (const [path, source] of Object.entries(big)) {
    it(`${path.split('/').pop()} keeps arrows out of boxes`, () => {
      expect(through(source)).toBeLessThanOrEqual(1);
      expect(checkScene(layout(parse(source))).filter((p) => p.kind === 'node-overlap')).toEqual([]);
    });
  }
});
