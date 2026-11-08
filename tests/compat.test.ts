// The 1.x promise: any source that parses without errors in 1.0 parses the
// same way in every 1.x release. tests/compat/1.0/ holds the corpus: each
// .inkling file and, beside it, the Doc that 1.0 parsed it into.
//
// - A file with no .json yet gets one written (new files may be added; run
//   scripts/compat-corpus.mjs to add every example).
// - An existing file's source must never change: its hash is stored.
// - Every key in the stored Doc must still have the same value. New keys are
//   allowed (a 1.x release may add fields), and so are new warnings; new errors
//   are not.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from '../src/core';
import { KEYWORDS } from '../src/core/syntax/parser';
import { tokenize } from '../src/core/syntax/tokens';

const dir = resolve(__dirname, 'compat', '1.0');
const files = readdirSync(dir).filter((f) => f.endsWith('.inkling')).sort();

/** The Doc as stable JSON: spans as line:column ranges, no diagnostics (checked apart). */
function normal(source: string) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') starts.push(i + 1);
  const col = (offset: number) => {
    let line = 0;
    while (line + 1 < starts.length && starts[line + 1] <= offset) line++;
    return `${line + 1}:${offset - starts[line]}`;
  };
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      const keys = Object.keys(o);
      if (keys.length === 3 && typeof o.line === 'number' && typeof o.from === 'number' && typeof o.to === 'number') return `${col(o.from)}-${col(o.to as number)}`;
      return Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, walk(o[k])]));
    }
    return v;
  };
  const { diagnostics: _, ...doc } = parse(source);
  return JSON.parse(JSON.stringify(walk(doc)));
}

/** The first place where `want` (the stored Doc) and `got` differ. Extra keys in `got` are fine. */
function differ(want: unknown, got: unknown, path = 'doc'): string | undefined {
  if (Array.isArray(want)) {
    if (!Array.isArray(got)) return `${path}: was a list`;
    if (want.length !== got.length) return `${path}: had ${want.length} items, now ${got.length}`;
    for (let i = 0; i < want.length; i++) {
      const d = differ(want[i], got[i], `${path}[${i}]`);
      if (d) return d;
    }
    return undefined;
  }
  if (want && typeof want === 'object') {
    if (!got || typeof got !== 'object') return `${path}: was an object`;
    for (const k of Object.keys(want)) {
      const d = differ((want as Record<string, unknown>)[k], (got as Record<string, unknown>)[k], `${path}.${k}`);
      if (d) return d;
    }
    return undefined;
  }
  return want === got ? undefined : `${path}: was ${JSON.stringify(want)}, now ${JSON.stringify(got)}`;
}

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);

describe('1.x compatibility corpus', () => {
  for (const f of files) {
    it(f, () => {
      const source = readFileSync(join(dir, f), 'utf8');
      const errors = parse(source).diagnostics.filter((d) => d.severity === 'error');
      expect(errors.map((d) => `${d.span.line}: ${d.message} [${d.code}]`)).toEqual([]);
      const store = join(dir, f.replace(/\.inkling$/, '.json'));
      if (!existsSync(store)) writeFileSync(store, JSON.stringify({ source: hash(source), doc: normal(source) }, null, 1) + '\n');
      const saved = JSON.parse(readFileSync(store, 'utf8'));
      expect(hash(source), 'corpus files are never edited; add a new file instead').toBe(saved.source);
      expect(differ(saved.doc, normal(source))).toBeUndefined();
    });
  }

  it('uses every keyword at least once', () => {
    const words = new Set(files.flatMap((f) => tokenize(readFileSync(join(dir, f), 'utf8')).map((toks) => toks.find((t) => t.type !== 'comment' && t.type !== 'rbrace')?.value)));
    expect([...new Set(KEYWORDS)].filter((k) => !words.has(k) && k !== 'brace')).toEqual([]);
  });

  it('notices a change in meaning', () => {
    const want = normal('a -> b : "x"');
    expect(differ(want, normal('a -> b : "y"'))).toMatch(/label: was "x", now "y"/);
    expect(differ(want, { ...normal('a -> b : "x"'), added: 1 })).toBeUndefined();
  });
});
