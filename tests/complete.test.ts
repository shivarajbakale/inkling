import { describe, expect, it } from 'vitest';
import { complete, definition, hover, symbols } from '../src/core';
import { KEYWORDS } from '../src/core/syntax/parser';

/** Completions at the | in `src`. */
const at = (src: string, explicit = true) => {
  const pos = src.indexOf('|');
  return complete(src.replace('|', ''), pos, { explicit });
};
const labels = (src: string, explicit = true) => at(src, explicit)?.items.map((i) => i.label) ?? [];

describe('complete', () => {
  it('offers statement words and names at the start of a line', () => {
    const l = labels('api: box\n|');
    expect(l).toContain('paper');
    expect(l).toContain('group');
    expect(l).toContain('api');
    expect(l).not.toContain('inkling');
  });

  it("puts the file's own layout words first, and other layouts' words last", () => {
    const r = at('layout venn\n|')!;
    const boost = (w: string) => r.items.find((i) => i.label === w)!.boost;
    expect(boost('set')).toBeGreaterThan(boost('paper')!);
    expect(boost('candles')).toBeLessThan(boost('paper')!);
    expect(r.items.find((i) => i.label === 'circle')!.doc).toMatch(/Loops around a node/);
  });

  it('replaces only the word typed so far', () => {
    const r = at('pa|')!;
    expect([r.from, r.to]).toEqual([0, 2]);
  });

  it('offers setting values, with their names', () => {
    const r = at('paper |', false)!;
    expect(r.items.map((i) => i.label)).toContain('notebook');
    expect(r.items.find((i) => i.label === 'graph')!.detail).toBe('Graph paper');
    expect(labels('layout |', false)).toContain('quadrant');
    expect(labels('branches |', false)).toEqual(['elbow', 'straight']);
  });

  it('offers shapes after id:, and option values after =', () => {
    expect(labels('a: |', false)).toContain('diamond');
    expect(labels('a: box "A" color=|', false)).toContain('red');
    expect(labels('a: icon |')).toContain('server');
    expect(labels('a: box "A" |')).toContain('size=');
  });

  it('offers names after an arrow, a mark and a step', () => {
    const src = 'api: box "API"\ndb: db\ngroup g { x }\n';
    expect(labels(src + 'api -> |')).toEqual(expect.arrayContaining(['api', 'db', 'g']));
    expect(labels(src + 'circle |')).toContain('db');
    expect(labels(src + 'step 1: api, |')).toContain('db');
    expect(at(src + 'api -> |')!.items.find((i) => i.label === 'api')!.detail).toBe('API');
  });

  it('stays quiet with nothing typed where the next word is unclear', () => {
    expect(at('api -> |', false)).toBeNull();
    expect(at('# a comment |')).toBeNull();
    expect(at('a: box "unfinished |')).toBeNull();
  });

  it('offers venn sets after in, and not one already named', () => {
    const src = 'layout venn\nset dogs "Dogs"\nset cats "Cats"\n';
    expect(labels(src + '- Fur in |', false)).toEqual(['dogs', 'cats']);
    expect(labels(src + '- Fur in dogs & |', false)).toEqual(['cats']);
    expect(labels(src + 'x: "X" in |', false)).toEqual(['dogs', 'cats']);
    expect(labels(src + 'highlight |')).toContain('dogs&cats');
  });

  it('offers quadrant squares after in, quoted', () => {
    const r = at('layout quadrant\nquadrants "Quick wins", "Big bets", "Fill-ins", "Money pit"\n- Dark mode in |', false)!;
    expect(r.items.map((i) => i.insert)).toEqual(['"Quick wins"', '"Big bets"', '"Fill-ins"', '"Money pit"']);
  });

  it('works inside groups and frames', () => {
    expect(labels('layout sequence\nloop {\n  |')).toContain('activate');
    expect(labels('group g {\n  a: box\n  a -> |')).toContain('a');
  });
});

describe('hover', () => {
  const h = (src: string) => {
    const pos = src.indexOf('|');
    return hover(src.replace('|', ''), pos);
  };

  it('explains every statement word', () => {
    const missing = [...new Set(KEYWORDS)].filter((k) => !hover(`${k} x`, 1));
    expect(missing).toEqual([]);
  });

  it('explains statements, shapes, options, settings and arrows', () => {
    expect(h('cir|cle a')!.text).toMatch(/Loops around a node/);
    expect(h('a: dia|mond')!.text).toMatch(/Shapes: box/);
    expect(h('a: data|base')!.text).toMatch(/another name for `db`/);
    expect(h('a: box "A" col|or=red')!.text).toMatch(/Options: ink color/);
    expect(h('paper gra|ph')!.text).toMatch(/Graph paper/);
    expect(h('layout ve|nn')!.text).toMatch(/set dogs/);
    expect(h('a -|-> b')!.text).toMatch(/Dashed/);
    expect(h('note ov|er a "x"')).not.toBeNull();
  });

  it('says where a name is defined', () => {
    const r = h('api: box "API"\nweb -> a|pi')!;
    expect(r.text).toMatch(/Defined on line 1/);
    expect(r.text).toContain('api: box "API"');
    expect(h('web -> a|pi')!.text).toMatch(/Not defined/);
  });

  it('gives the range of the word', () => {
    const r = hover('circle a', 2)!;
    expect([r.from, r.to]).toEqual([0, 6]);
  });
});

describe('symbols and definition', () => {
  const src = ['title "T"', 'api: box "API"', 'group back "Backend" {', '  db: db "Orders"', '}', 'api -> db -> cache', 'step 1: api "first"'].join('\n');

  it('lists defined nodes, groups and steps in source order', () => {
    expect(symbols(src).map((s) => [s.kind, s.name, s.detail])).toEqual([
      ['node', 'api', 'API'],
      ['group', 'back', 'Backend'],
      ['node', 'db', 'Orders'],
      ['step', 'step 1', 'first'],
    ]);
  });

  it('finds where a name is defined', () => {
    const use = src.indexOf('db -> cache') + 1;
    const d = definition(src, use)!;
    expect(d.line).toBe(4);
    expect(definition(src, src.indexOf('back"') - 1)).toBeNull();
    expect(definition(src, src.lastIndexOf('api') + 1)!.line).toBe(2);
  });
});
