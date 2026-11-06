import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { format, parse } from '../src/core';
import { FIXTURES } from './fixtures';

/** The meaning of a parse, without positions. */
function meaning(src: string) {
  const d = parse(src);
  const strip = <T extends object>(x: T) => {
    const { span, line, order, ...rest } = x as T & { span?: unknown; line?: unknown; order?: unknown };
    void span;
    void line;
    void order;
    return rest;
  };
  return {
    settings: [d.title, d.paper, d.pen, d.hand, d.mess, d.seed, d.direction, d.autoSteps],
    nodes: d.nodes.map(strip),
    edges: d.edges.map(strip),
    annotations: d.annotations.map(strip),
    steps: d.steps.map(strip),
    groups: d.groups.map(strip),
    codes: d.diagnostics.map((x) => x.code),
  };
}

describe('format', () => {
  it('tidies spacing and indentation', () => {
    const messy = 'title   "T"  \n\n\n\napi:box "API"   color = red\na->b:  hello there   # note\ngroup g "G" {\napi\n}\nstep 1:a,b "go"\n';
    expect(format(messy)).toBe('title "T"\n\napi: box "API" color=red\na -> b : hello there # note\ngroup g "G" {\n  api\n}\nstep 1: a, b "go"\n');
  });

  it('keeps bullet indentation in steps of two', () => {
    expect(format('- a\n\t- b\n   - c\n')).toBe('- a\n  - b\n  - c\n');
  });

  it('is idempotent and keeps meaning on every fixture', () => {
    for (const src of Object.values(FIXTURES)) {
      const once = format(src);
      expect(format(once)).toBe(once);
      expect(meaning(once)).toEqual(meaning(src));
    }
  });

  it('keeps meaning on random edits of fixtures', () => {
    const sources = Object.values(FIXTURES);
    fc.assert(
      fc.property(fc.nat(), fc.nat(), fc.constantFrom('  ', '', '\t', '   '), (i, j, ws) => {
        const lines = sources[i % sources.length].split('\n');
        const k = j % lines.length;
        lines[k] = ws + lines[k].replace(/ -> /g, '->').replace(/: /g, ':') + ws;
        const src = lines.join('\n');
        const once = format(src);
        expect(format(once)).toBe(once);
        expect(meaning(once)).toEqual(meaning(src));
      }),
      { numRuns: 300 },
    );
  });
});
