import { describe, expect, it } from 'vitest';
import { tokenize, tokenizeLine } from '../src/core/syntax/tokens';

const types = (line: string) => tokenizeLine(line, 1).map((t) => `${t.type}:${t.value}`);

describe('tokenizer', () => {
  it('reads a node line', () => {
    expect(types('api: box "API" yellow')).toEqual(['ident:api', 'colon::', 'ident:box', 'string:API', 'ident:yellow']);
  });

  it('reads every arrow, longest first', () => {
    expect(types('a -> b --> c ~> d <-> e <~> f').filter((t) => t.startsWith('arrow'))).toEqual([
      'arrow:->',
      'arrow:-->',
      'arrow:~>',
      'arrow:<->',
      'arrow:<~>',
    ]);
  });

  it('keeps hyphens inside names but not before an arrow', () => {
    expect(types('load-balancer->api')).toEqual(['ident:load-balancer', 'arrow:->', 'ident:api']);
  });

  it('unescapes strings', () => {
    expect(tokenizeLine('"a\\nb \\"c\\""', 1)[0].value).toBe('a\nb "c"');
  });

  it('flags an unclosed string', () => {
    const [t] = tokenizeLine('"oops', 1);
    expect(t.type).toBe('string');
    expect(t.error).toMatch(/closing quote/);
  });

  it('treats # as a comment only after a space', () => {
    expect(types('a -> b # note')).toEqual(['ident:a', 'arrow:->', 'ident:b', 'comment:# note']);
    expect(types('"#1" -> b').slice(0, 1)).toEqual(['string:#1']);
  });

  it('reads @step, numbers, bullets and words', () => {
    expect(types('circle a @3')).toEqual(['ident:circle', 'ident:a', 'at:3']);
    expect(types('mess 0.45')).toEqual(['ident:mess', 'number:0.45']);
    expect(types('  - Vocabulary')).toEqual(['bullet:-', 'ident:Vocabulary']);
    expect(types('.com')).toEqual(['word:.com']);
  });

  it('gives absolute offsets across lines', () => {
    const lines = tokenize('a -> b\nc: box');
    expect(lines[1][0]).toMatchObject({ value: 'c', from: 7, to: 8, line: 2 });
  });
});
