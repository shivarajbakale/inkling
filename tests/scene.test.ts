import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkScene, layout, parse, render } from '../src/core';
import { FIXTURES } from './fixtures';

describe('scene invariants on every fixture', () => {
  for (const [name, source] of Object.entries(FIXTURES)) {
    it(name, () => {
      const doc = parse(source);
      expect(doc.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(checkScene(layout(doc))).toEqual([]);
    });
  }
});

const SHAPES = ['box', 'round', 'circle', 'diamond', 'cloud', 'db', 'sticky', 'person', 'text'];
const MARKS = ['circle', 'underline', 'strike', 'highlight', 'check', 'cross'];
const ARROWS = ['->', '-->', '~>', '<->', '<~>'];
const word = fc.constantFrom('API', 'Cache', 'Queue', 'user', 'Résumé', 'DNS lookup', 'a', 'Very long label here', '42', 'x\\ny');

/** Random but valid Inkling source. */
const program = fc
  .record({
    n: fc.integer({ min: 1, max: 40 }),
    shapes: fc.array(fc.constantFrom(...SHAPES), { minLength: 40, maxLength: 40 }),
    labels: fc.array(word, { minLength: 40, maxLength: 40 }),
    edges: fc.array(fc.tuple(fc.nat(), fc.nat(), fc.constantFrom(...ARROWS), fc.option(word)), { maxLength: 60 }),
    marks: fc.array(fc.tuple(fc.constantFrom(...MARKS), fc.nat()), { maxLength: 8 }),
    notes: fc.array(fc.tuple(fc.nat(), word), { maxLength: 4 }),
    down: fc.boolean(),
    mess: fc.double({ min: 0, max: 1, noNaN: true }),
    seed: fc.integer({ min: 0, max: 9999 }),
    paper: fc.constantFrom('notebook', 'graph', 'chalkboard', 'blueprint', 'napkin'),
    title: fc.option(word),
    opts: fc.array(fc.tuple(fc.nat(), fc.constantFrom('color=red', 'pen=marker', 'size=large', 'size=small', 'fill=green', 'icon=gear')), { maxLength: 4 }),
    groupSize: fc.integer({ min: 0, max: 6 }),
    edgeMark: fc.option(fc.constantFrom('circle', 'check', 'cross', 'highlight')),
    auto: fc.boolean(),
  })
  .map((r) => {
    const lines: string[] = [];
    if (r.title) lines.push(`title "${r.title}"`);
    lines.push(`paper ${r.paper}`, `mess ${r.mess.toFixed(2)}`, `seed ${r.seed}`);
    if (r.down) lines.push('layout down');
    for (let i = 0; i < r.n; i++) lines.push(`n${i}: ${r.shapes[i]} "${r.labels[i]}"`);
    for (const [a, b, op, label] of r.edges) lines.push(`n${a % r.n} ${op} n${b % r.n}${label ? ` : "${label}"` : ''}`);
    for (const [kind, i] of r.marks) lines.push(`${kind} n${i % r.n}`);
    for (const [i, text] of r.notes) lines.push(`note n${i % r.n} "${text}"`);
    for (const [i, opt] of r.opts) lines.push(`n${i % r.n}: box "opt" ${opt}`);
    if (r.groupSize > 0 && r.n > 2) {
      const members = Array.from({ length: Math.min(r.groupSize, r.n - 1) }, (_, k) => `n${k}`);
      lines.push(`group grp "Group" { ${members.join(', ')} }`);
    }
    if (r.edges.length && r.edgeMark) lines.push(`${r.edgeMark} n${r.edges[0][0] % r.n} -> n${r.edges[0][1] % r.n}`);
    if (r.auto) lines.push('steps auto');
    return lines.join('\n');
  });

describe('fuzz', () => {
  it('any valid program parses cleanly, renders, and keeps nodes apart', () => {
    fc.assert(
      fc.property(program, (src) => {
        const doc = parse(src);
        expect(doc.diagnostics.filter((d) => d.code !== 'E-DUPLICATE-NODE')).toEqual([]);
        expect(checkScene(layout(doc)).filter((p) => p.kind === 'node-overlap' || p.kind === 'group-intrudes')).toEqual([]);
        expect(() => render(src, {}, { idPrefix: 'f' })).not.toThrow();
      }),
      { numRuns: Number(process.env.FUZZ_RUNS ?? 300) },
    );
  });

  it('any text at all parses without throwing', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 400 }), (src) => {
        expect(() => render(src, {}, { idPrefix: 'f' })).not.toThrow();
      }),
      { numRuns: 300 },
    );
  });
});

describe('performance', () => {
  it('60 nodes and 90 arrows lay out and draw quickly', () => {
    const lines = ['seed 3'];
    for (let i = 0; i < 60; i++) lines.push(`n${i}: box "Node ${i}"`);
    for (let i = 0; i < 90; i++) lines.push(`n${(i * 7) % 60} -> n${(i * 13 + 1) % 60}`);
    const src = lines.join('\n');
    render(src, {}, { idPrefix: 'w' }); // warm up
    const t0 = performance.now();
    render(src, {}, { idPrefix: 'p' });
    const ms = performance.now() - t0;
    // jsdom is several times slower than a browser; the browser budget is 150 ms.
    expect(ms).toBeLessThan(1500);
  });
});
