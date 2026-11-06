import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkScene, layout, parse, render } from '../src/core';

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
    const LAYOUTS = ['flow', 'free', 'stack', 'cycle', 'timeline', 'mindmap', 'sequence'];
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
