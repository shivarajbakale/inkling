import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COLORS, HANDS, PAPERS, PENS } from '../src/core';
import { INKS, LAYOUT_NAMES, SIZES } from '../src/core/styles';
import { ARROWS } from '../src/core/syntax/tokens';
import { DEPRECATED, EDGE_OPTIONS, KEYWORDS, NODE_OPTIONS, RESERVED, SHAPES, SHAPE_ALIASES } from '../src/core/syntax/parser';

// docs/language.md is the spec. It must mention everything the parser knows,
// written as code (`word`), so it can't quietly fall behind.
const spec = readFileSync(resolve(__dirname, '../docs/language.md'), 'utf8');
const missing = (words: string[]) => [...new Set(words)].filter((w) => !new RegExp(`[\`|\\s(]${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\`|\\s,)=]`).test(spec));

describe('docs/language.md covers the parser', () => {
  it('every keyword', () => expect(missing([...KEYWORDS])).toEqual([]));
  it('every shape and other shape name', () => expect(missing([...SHAPES, ...Object.keys(SHAPE_ALIASES)])).toEqual([]));
  it('every layout', () => expect(missing(LAYOUT_NAMES)).toEqual([]));
  it('every option', () => expect(missing([...NODE_OPTIONS, ...EDGE_OPTIONS])).toEqual([]));
  it('every arrow', () => expect(missing([...ARROWS])).toEqual([]));
  it('every paper, pen, hand, colour, ink and size', () =>
    expect(missing([...Object.keys(PAPERS), ...Object.keys(PENS), ...Object.keys(HANDS), ...Object.keys(COLORS), ...Object.keys(INKS), ...Object.keys(SIZES)])).toEqual([]));
  it('every reserved and deprecated word', () => expect(missing([...RESERVED, ...Object.keys(DEPRECATED)])).toEqual([]));
});
