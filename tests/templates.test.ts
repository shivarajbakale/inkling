import { describe, expect, it } from 'vitest';
import { parse } from '../src/core';
import { BLANK, layoutsOf, readTemplate, TEMPLATES } from '../src/app/templates';

describe('templates', () => {
  it('has templates, each with a name, layout and description', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(3);
    for (const t of TEMPLATES) {
      expect(t.name, t.id).not.toBe(t.id);
      expect(t.layout, t.id).toMatch(/^[a-z]+$/);
      expect(t.description, t.id).not.toBe('');
      expect(t.source.startsWith('#'), t.id).toBe(false);
    }
  });

  it('parse without errors or warnings', () => {
    for (const t of [...TEMPLATES, { id: 'blank', source: BLANK }]) expect(parse(t.source).diagnostics, t.id).toEqual([]);
  });

  it('groups by any layout name, flow first', () => {
    const list = ['zeta', 'cycle', 'flow', 'flow'].map((layout, i) => readTemplate(`x/${i}.inkling`, `# name: N\n# layout: ${layout}\n# description: d\na -> b\n`));
    expect(layoutsOf(list)).toEqual(['flow', 'cycle', 'zeta']);
    expect(list[0].source).toBe('a -> b\n');
  });
});
