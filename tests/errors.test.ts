import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parse } from '../src/core';
import { FIXTURES } from './fixtures';

const root = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');
const walk = (dir: string): string[] =>
  readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.ts') || e.name.endsWith('.tsx') ? [`${dir}/${e.name}`] : []));
const apply = (src: string, fix: { span: { from: number; to: number }; text: string }) => src.slice(0, fix.span.from) + fix.text + src.slice(fix.span.to);

describe('every diagnostic code is documented and tested', () => {
  const docs = new Set([...read('docs/errors.md').matchAll(/^\| `([EW]-[A-Z0-9-]+)`/gm)].map((m) => m[1]));
  const source = walk('src').map(read).join('\n');
  // Codes written whole, plus the ones the settings check builds (E-UNKNOWN-PAPER and so on).
  const used = new Set([...source.matchAll(/'([EW]-[A-Z0-9-]+)'/g)].map((m) => m[1]));
  for (const key of ['paper', 'pen', 'hand', 'layout']) used.add(`E-UNKNOWN-${key.toUpperCase()}`);
  const tests = walk('tests').filter((f) => !f.endsWith('errors.test.ts')).map(read).join('\n');

  it('every code the source uses is in docs/errors.md', () => {
    expect([...used].filter((c) => !docs.has(c))).toEqual([]);
  });
  it('every code in docs/errors.md is still used', () => {
    expect([...docs].filter((c) => !used.has(c))).toEqual([]);
  });
  it('every code has a test that triggers it', () => {
    expect([...docs].filter((c) => c !== 'E-INTERNAL' && !tests.includes(`'${c}'`))).toEqual([]);
  });
});

describe('one-click fixes', () => {
  // Each case: the broken source, the code it gives, and the source after the fix.
  const cases: [string, string, string][] = [
    ['a: box "API', 'E-UNCLOSED-STRING', 'a: box "API"'],
    ['group g {\n  a: box', 'E-UNCLOSED-GROUP', 'group g {\n  a: box\n}\n'],
    ['layout sequence\nloop {\n  a -> b\n', 'E-UNCLOSED-FRAME', 'layout sequence\nloop {\n  a -> b\n}\n'],
    ['a => b', 'E-BAD-ARROW', 'a -> b'],
    ['a - > b : "hi"', 'E-BAD-ARROW', 'a -> b : "hi"'],
    ['a ---> b', 'E-BAD-ARROW', 'a --> b'],
    ['a —> b', 'E-BAD-ARROW', 'a -> b'],
    ['api box "API"', 'E-MISSING-COLON', 'api: box "API"'],
    ['api "API"', 'E-MISSING-COLON', 'api: "API"'],
    ['papr notebook', 'E-UNKNOWN-LINE', 'paper notebook'],
    ['apple: box\ncircle aple', 'E-UNKNOWN-TARGET', 'apple: box\ncircle apple'],
    ['apple: box\nstep 1: aple', 'W-STEP-UNKNOWN', 'apple: box\nstep 1: apple'],
    ['server: box\na -> serer : "hi"', 'W-NEW-NAME', 'server: box\na -> server : "hi"'],
    ['layout venn\nset dogs\nset cats\n- Bark in dgos', 'E-UNKNOWN-SET', 'layout venn\nset dogs\nset cats\n- Bark in dogs'],
    ['set dogs "Dogs"\nset cats', 'W-WRONG-LAYOUT', 'layout venn\nset dogs "Dogs"\nset cats'],
    ['title "T"\nbranches straight\n- a', 'W-WRONG-LAYOUT', 'layout tree\ntitle "T"\nbranches straight\n- a'],
  ];
  for (const [src, code, fixed] of cases)
    it(`${code}: ${JSON.stringify(src)}`, () => {
      const d = parse(src).diagnostics.find((x) => x.code === code);
      expect(d, `no ${code}`).toBeDefined();
      expect(d!.fix, 'no fix').toBeDefined();
      const out = apply(src, d!.fix!);
      expect(out).toBe(fixed);
      expect(parse(out).diagnostics.filter((x) => x.severity === 'error' || x.code === code)).toEqual([]);
    });

  it('W-WRONG-LAYOUT has no fix when a layout line is already there', () => {
    const d = parse('layout flow\nset a "A"').diagnostics.find((x) => x.code === 'W-WRONG-LAYOUT')!;
    expect(d.fix).toBeUndefined();
    expect(d.hint).toMatch(/Change the layout line/);
  });

  it('a name close to a defined one, but differing only in digits, is not a typo', () => {
    expect(parse('step1: box\nstep1 -> step2').diagnostics).toEqual([]);
  });
});

describe('one cause, one diagnostic', () => {
  it('lists the other uses of an unknown name as related places', () => {
    const src = 'apple: box\ncircle aple\nnote aple "x"\nunderline aple';
    const ds = parse(src).diagnostics.filter((d) => d.code === 'E-UNKNOWN-TARGET');
    expect(ds).toHaveLength(1);
    expect(ds[0].related!.map((s) => s.line)).toEqual([3, 4]);
  });

  it('reports a misspelt arrow end once, however often it is used', () => {
    const ds = parse('server: box\na -> serer\nb -> serer\nserer -> c').diagnostics;
    expect(ds.map((d) => d.code)).toEqual(['W-NEW-NAME']);
    expect(ds[0].related).toHaveLength(2);
  });
});

describe('fuzz: diagnostics stay well formed on mangled examples', () => {
  const sources = Object.values(FIXTURES);
  const junk = ['"', '{', '}', ':', '->', '-', '=', ',', '@', '#', '\n', ' ', 'x', '..', '&', '—', '9'];
  it('never throws, and every diagnostic has a message and spans inside the source', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: sources.length - 1 }),
        fc.array(fc.tuple(fc.nat(), fc.constantFrom('insert', 'delete', 'replace'), fc.constantFrom(...junk)), { minLength: 1, maxLength: 4 }),
        (k, edits) => {
          let src = sources[k];
          for (const [at, how, text] of edits) {
            const i = at % (src.length + 1);
            src = how === 'insert' ? src.slice(0, i) + text + src.slice(i) : how === 'delete' ? src.slice(0, i) + src.slice(i + 1) : src.slice(0, i) + text + src.slice(i + 1);
          }
          const doc = parse(src);
          const inside = (s: { from: number; to: number }) => s.from >= 0 && s.to <= src.length && s.from <= s.to;
          for (const d of doc.diagnostics) {
            expect(d.message.trim()).not.toBe('');
            expect(inside(d.span), `${d.code} span`).toBe(true);
            for (const r of d.related ?? []) expect(inside(r)).toBe(true);
            if (d.fix) {
              expect(inside(d.fix.span), `${d.code} fix span`).toBe(true);
              parse(apply(src, d.fix));
            }
          }
        },
      ),
      { numRuns: Number(process.env.FUZZ_RUNS ?? 400) },
    );
  });
});
