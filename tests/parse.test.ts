import { describe, expect, it } from 'vitest';
import { parse } from '../src/core/parse';

const codes = (src: string) => parse(src).diagnostics.map((d) => d.code);

describe('parser: statements', () => {
  it('reads settings', () => {
    const d = parse('title "Hi"\npaper chalkboard\npen chalk\nhand kalam\nmess 0.2\nseed 9\nlayout down');
    expect(d).toMatchObject({ title: 'Hi', paper: 'chalkboard', pen: 'chalk', hand: 'kalam', mess: 0.2, seed: 9, direction: 'down' });
    expect(d.diagnostics).toEqual([]);
  });

  it('reads nodes, aliases and fills', () => {
    const d = parse('a: box "A"\nb: database\nc: "C" yellow\nd: green');
    expect(d.nodes.map((n) => [n.id, n.shape, n.label, n.fill])).toEqual([
      ['a', 'box', 'A', undefined],
      ['b', 'db', 'b', undefined],
      ['c', 'box', 'C', 'yellow'],
      ['d', 'box', 'd', 'green'],
    ]);
  });

  it('reads arrow chains; the label goes on the last arrow', () => {
    const d = parse('a -> b ~> c --> d : "done"');
    expect(d.edges.map((e) => [e.from, e.to, e.kind, e.label])).toEqual([
      ['a', 'b', 'solid', undefined],
      ['b', 'c', 'squiggle', undefined],
      ['c', 'd', 'dashed', 'done'],
    ]);
  });

  it('keeps unquoted labels as written', () => {
    expect(parse('a -> b : 93.184.216.34').edges[0].label).toBe('93.184.216.34');
  });

  it('makes nodes for names only used in arrows', () => {
    const d = parse('load-balancer -> api');
    expect(d.nodes.map((n) => [n.id, n.label, n.implicit])).toEqual([
      ['load-balancer', 'load balancer', true],
      ['api', 'api', true],
    ]);
  });

  it('accepts quoted names with spaces', () => {
    const d = parse('"Load balancer" -> api');
    expect(d.nodes[0].id).toBe('Load balancer');
  });

  it('lets a later definition style an arrow-made node', () => {
    const d = parse('a -> b\nb: cloud "Bee"');
    expect(d.nodes[1]).toMatchObject({ id: 'b', shape: 'cloud', label: 'Bee' });
    expect(d.diagnostics).toEqual([]);
  });

  it('reads marks', () => {
    const d = parse('a: box\ncircle a\nnote a "hi" @2\nhighlight a pink');
    expect(d.annotations.map((a) => [a.kind, a.target, a.text, a.at, a.color])).toEqual([
      ['circle', 'a', undefined, undefined, undefined],
      ['note', 'a', 'hi', 2, undefined],
      ['highlight', 'a', undefined, undefined, 'pink'],
    ]);
  });

  it('reads steps in number order', () => {
    const d = parse('a -> b\nstep 2: b "second"\nstep 1: a');
    expect(d.steps.map((s) => [s.index, s.items, s.caption])).toEqual([
      [1, ['a'], undefined],
      [2, ['b'], 'second'],
    ]);
  });

  it('ignores comments and blank lines', () => {
    const d = parse('# heading\n\na -> b # trailing\n');
    expect(d.edges).toHaveLength(1);
    expect(d.diagnostics).toEqual([]);
  });

  it('lets keywords be node names when used as names', () => {
    const d = parse('pen: box "Sketch pen"\nlayout -> pen');
    expect(d.nodes.map((n) => n.id)).toEqual(['pen', 'layout']);
    expect(d.pen).toBe('ballpoint');
  });

  it('records where every statement was written', () => {
    const src = 'a: box\n  a -> b : hi';
    const d = parse(src);
    expect(src.slice(d.edges[0].span.from, d.edges[0].span.to)).toBe('a -> b : hi');
    expect(d.edges[0].span.line).toBe(2);
    expect(d.nodes[0].order).toBeLessThan(d.edges[0].order);
  });
});

describe('parser: diagnostics', () => {
  const cases: [string, string, string?][] = [
    ['E-UNCLOSED-STRING', 'a: box "oops'],
    ['E-MISSING-VALUE', 'paper'],
    ['E-UNEXPECTED', 'paper notebook extra'],
    ['E-UNKNOWN-PAPER', 'paper notbook', 'notebook'],
    ['E-UNKNOWN-PEN', 'pen markr', 'marker'],
    ['E-UNKNOWN-HAND', 'hand cavet', 'caveat'],
    ['E-UNKNOWN-LAYOUT', 'layout left'],
    ['E-BAD-MESS', 'mess 3'],
    ['E-BAD-SEED', 'seed 1.5'],
    ['E-ARROW-NEEDS-ENDS', 'a -> '],
    ['E-BAD-NAME', '.com -> b'],
    ['E-BAD-NODE', 'a: box "A" red extra'],
    ['E-UNKNOWN-SHAPE', 'a: rectangel "A"', 'rectangle'],
    ['E-UNKNOWN-COLOR', 'a: box "A" yelow', 'yellow'],
    ['E-DUPLICATE-NODE', 'a: box\na: circle'],
    ['E-NOTE-NEEDS-TEXT', 'a: box\nnote a'],
    ['E-UNKNOWN-TARGET', 'apple: box\ncircle aple', 'apple'],
    ['W-STEP-UNKNOWN', 'apple: box\nstep 1: aple', 'apple'],
    ['E-UNKNOWN-LINE', 'papr notebook', 'paper'],
  ];

  for (const [code, src, suggestion] of cases) {
    it(code, () => {
      const d = parse(src).diagnostics;
      expect(d.map((x) => x.code)).toContain(code);
      const diag = d.find((x) => x.code === code)!;
      expect(diag.message.length).toBeGreaterThan(10);
      expect(diag.severity).toBe(code.startsWith('W-') ? 'warning' : 'error');
      if (suggestion) expect(diag.hint).toContain(`"${suggestion}"`);
    });
  }

  it('offers a mechanical fix for a typo', () => {
    const src = 'a: rectangel "A"';
    const fix = parse(src).diagnostics[0].fix!;
    expect(src.slice(0, fix.span.from) + fix.text + src.slice(fix.span.to)).toBe('a: rectangle "A"');
  });

  it('keeps parsing after a bad line', () => {
    const d = parse('a -> b\nthis is nonsense\nc -> d');
    expect(d.edges).toHaveLength(2);
    expect(codes('a -> b\nthis is nonsense\nc -> d')).toEqual(['E-UNKNOWN-LINE']);
  });

  it('never throws on junk', () => {
    for (const junk of ['', '"', ':::', '-> -> ->', '{ } @ @1', '\u0000 ', 'a'.repeat(5000)]) {
      expect(() => parse(junk)).not.toThrow();
    }
  });
});
