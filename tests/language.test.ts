import { describe, expect, it } from 'vitest';
import { describe as describeDoc, LIMITS, parse, render } from '../src/core';

describe('v0.3 language', () => {
  it('reads node options', () => {
    const d = parse('a: box "A" yellow color=red pen=marker size=large');
    expect(d.nodes[0]).toMatchObject({ fill: 'yellow', color: 'red', pen: 'marker', size: 'large' });
    expect(d.diagnostics).toEqual([]);
  });

  it('reads fill as an option too', () => {
    expect(parse('a: box "A" fill=blue').nodes[0].fill).toBe('blue');
  });

  it('reads icons, positional or as an option', () => {
    const d = parse('a: icon server "API"\nb: "Data" icon=database');
    expect(d.nodes.map((n) => [n.shape, n.icon])).toEqual([
      ['icon', 'server'],
      ['icon', 'database'],
    ]);
  });

  it('reads arrow options after a quoted label, an unquoted label, or no label', () => {
    const d = parse('a -> b : "go" color=red\nb -> c : two words pen=pencil\nc -> d color=blue');
    expect(d.edges.map((e) => [e.label, e.color, e.pen])).toEqual([
      ['go', 'red', undefined],
      ['two words', undefined, 'pencil'],
      [undefined, 'blue', undefined],
    ]);
    expect(d.diagnostics).toEqual([]);
  });

  it('reads groups, nested one level, and the one-line form', () => {
    const d = parse(['group back "Backend" {', '  api: box', '  group data {', '    db: db', '  }', '  api -> db', '}', 'group edge "Edge" { cdn, lb }'].join('\n'));
    expect(d.groups.map((g) => [g.id, g.label, g.parent, g.members])).toEqual([
      ['back', 'Backend', undefined, ['api']],
      ['data', 'data', 'back', ['db']],
      ['edge', 'Edge', undefined, ['cdn', 'lb']],
    ]);
    expect(d.nodes.find((n) => n.id === 'db')!.group).toBe('data');
    expect(d.diagnostics).toEqual([]);
  });

  it('does not pull an existing node into a group by mentioning it in an arrow', () => {
    const d = parse('a: box\ngroup g {\n  b: box\n  a -> b\n}');
    expect(d.nodes.find((n) => n.id === 'a')!.group).toBeUndefined();
  });

  it('reads marks on arrows and on groups', () => {
    const d = parse('a -> b : "x"\ngroup g { a }\ncircle a -> b\nnote b -> a "back"\ncircle g');
    expect(d.annotations.map((a) => [a.kind, a.targetKind, a.edgeIndex])).toEqual([
      ['circle', 'edge', 0],
      ['note', 'edge', 0],
      ['circle', 'group', undefined],
    ]);
  });

  it('reads steps auto and the version line', () => {
    const d = parse('inkling 1\nsteps auto\na -> b');
    expect(d.autoSteps).toBe(true);
    expect(d.version).toBe(1);
  });

  it('gives each node its own step with steps auto', () => {
    const { drawing } = render('steps auto\na -> b -> c', {}, { idPrefix: 's' });
    expect(drawing.steps.map((s) => s.index)).toEqual([1, 2, 3]);
  });

  it('lets a step name a group', () => {
    const { drawing } = render('group g { a, b }\nc: box\nstep 1: c\nstep 2: g', {}, { idPrefix: 's' });
    expect(drawing.steps.map((s) => s.index)).toEqual([1, 2]);
  });
});

describe('v0.3 diagnostics', () => {
  const cases: [string, string, string?][] = [
    ['E-UNKNOWN-OPTION', 'a: box "A" colour=red', 'color'],
    ['E-BAD-OPTION', 'a: box "A" color=redd', 'red'],
    ['E-BAD-OPTION', 'a -> b : "x" pen=markr', 'marker'],
    ['E-BAD-GROUP', 'group'],
    ['E-BAD-GROUP', 'group g "G"'],
    ['E-DUPLICATE-GROUP', 'group g { a }\ngroup g { b }'],
    ['E-GROUP-TOO-DEEP', 'group a {\ngroup b {\ngroup c {\nx: box\n}\n}\n}'],
    ['E-UNCLOSED-GROUP', 'group g {\na: box'],
    ['E-GROUP-NAME-TAKEN', 'g: box\ngroup g { a }'],
    ['W-EMPTY-GROUP', 'group g {\n}'],
    ['E-ICON-NEEDS-NAME', 'a: icon "A"'],
    ['E-UNKNOWN-ICON', 'a: icon sever "A"', 'server'],
    ['E-BAD-STEPS', 'steps manual'],
    ['W-VERSION', 'inkling 0'],
    ['E-VERSION-TOO-NEW', 'inkling 2\na -> b'],
    ['W-DEPRECATED', 'layout stack\n- a\n- b\nbrace a..b "x"'],
    ['E-RESERVED', 'style a red'],
    ['W-NO-LABEL', 'a -> b\nunderline a -> b'],
    ['W-STEPS-IGNORED', 'steps auto\na: box\nstep 1: a'],
    ['E-UNKNOWN-TARGET', 'a: box\nb: box\ncircle a -> b'],
    ['E-UNEXPECTED', '}'],
  ];
  for (const [code, src, suggestion] of cases) {
    it(`${code}: ${src.split('\n')[0]}`, () => {
      const d = parse(src).diagnostics.find((x) => x.code === code);
      expect(d, JSON.stringify(parse(src).diagnostics)).toBeDefined();
      expect(d!.severity).toBe(code.startsWith('W-') ? 'warning' : 'error');
      if (suggestion) expect(d!.hint).toContain(`"${suggestion}"`);
    });
  }

  it('a file for a newer language is refused, not drawn wrong', () => {
    const d = parse('inkling 2\ntitle "Later"\na -> b');
    expect(d.nodes).toEqual([]);
    expect(d.title).toBeUndefined();
    expect(d.diagnostics.map((x) => x.code)).toEqual(['E-VERSION-TOO-NEW']);
    expect(parse('inkling 1\na -> b').diagnostics).toEqual([]);
  });

  it('a deprecated word still works and offers its new name', () => {
    const src = 'layout stack\n- a\n- b\nbrace a..b "x"';
    const d = parse(src);
    expect(d.ranges).toEqual([expect.objectContaining({ kind: 'span', from: 'a', to: 'b' })]);
    expect(d.diagnostics[0].fix!.text).toBe('span');
  });

  it('reserved words are skipped as statements but still work as names', () => {
    expect(parse('style -> b\nlink: box "Link"\ncircle link').diagnostics).toEqual([]);
  });

  it('W-WIDE comes from the layout', () => {
    const src = Array.from({ length: 9 }, (_, i) => `n${i} -> n${i + 1}`).join('\n');
    expect(render(src, {}, { idPrefix: 'w' }).doc.diagnostics.map((d) => d.code)).toContain('W-WIDE');
    expect(render('layout down\n' + src, {}, { idPrefix: 'w' }).doc.diagnostics.map((d) => d.code)).not.toContain('W-WIDE');
  });

  it('W-TOO-BIG draws large files without animation', () => {
    const src = Array.from({ length: LIMITS.nodes + 1 }, (_, i) => `n${i}: box`).join('\n');
    const { doc, drawing } = render(src, {}, { idPrefix: 'b' });
    expect(doc.diagnostics.map((d) => d.code)).toContain('W-TOO-BIG');
    expect(drawing.duration).toBeLessThan(0.01);
  });
});

describe('description for screen readers', () => {
  it('lists groups, arrows, lone nodes and notes', () => {
    const doc = parse('title "T"\ngroup g "Back" { api }\nuser -> api : "calls"\nlonely: box "Alone"\nnote api "fast"');
    expect(describeDoc(doc)).toBe('T. Back contains api. user → api: calls. Also shown: Alone. Note on api: fast.');
  });

  it('is in the SVG', () => {
    const { drawing } = render('a -> b', {}, { idPrefix: 'd' });
    expect(drawing.svg.querySelector('desc')!.textContent).toBe('a → b.');
  });
});
