/**
 * The tokenizer. Inkling is line-based, so lines are tokenized one at a time.
 * The parser and the playground's editor highlighting both use this, so they
 * always agree on what the syntax is.
 */

export type TokenType =
  | 'ident'
  | 'string'
  | 'number'
  | 'arrow'
  | 'colon'
  | 'comma'
  | 'equals'
  | 'at'
  | 'bullet'
  | 'lbrace'
  | 'rbrace'
  | 'comment'
  | 'dots'
  | 'word';

export interface Token {
  type: TokenType;
  /** Exactly as written. */
  text: string;
  /** For strings: the unquoted, unescaped value. For `@3`: "3". Otherwise the text. */
  value: string;
  /** Absolute offsets in the whole source. */
  from: number;
  to: number;
  line: number;
  /** Set when the token itself is malformed, such as an unclosed string. */
  error?: string;
}

export const ARROWS = ['<~>', '<->', '-->', '->', '~>'] as const;
const IDENT = /^[A-Za-z_][\w]*(?:-[\w]+)*/;
const NUMBER = /^\d+(?:\.\d+)?(?![A-Za-z_])/;
const WORD = /^(?:[^\s:,="{}@.]|\.(?!\.))+/;

function unescape(s: string): string {
  return s.replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c));
}

/** Tokenizes one line. `offset` is where the line starts in the whole source. */
export function tokenizeLine(text: string, line: number, offset = 0): Token[] {
  const out: Token[] = [];
  let i = 0;
  const push = (type: TokenType, start: number, end: number, value?: string, error?: string) => {
    const raw = text.slice(start, end);
    out.push({ type, text: raw, value: value ?? raw, from: offset + start, to: offset + end, line, error });
  };
  const firstNonSpace = text.search(/\S/);

  while (i < text.length) {
    const c = text[i];
    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      continue;
    }
    if (c === '#' && (i === 0 || /\s/.test(text[i - 1]))) {
      push('comment', i, text.length);
      break;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      if (j >= text.length) {
        push('string', i, text.length, unescape(text.slice(i + 1)), 'This text is missing its closing quote.');
        break;
      }
      push('string', i, j + 1, unescape(text.slice(i + 1, j)));
      i = j + 1;
      continue;
    }
    if (text.startsWith('..', i)) {
      push('dots', i, i + 2);
      i += 2;
      continue;
    }
    const arrow = ARROWS.find((a) => text.startsWith(a, i));
    if (arrow) {
      push('arrow', i, i + arrow.length);
      i += arrow.length;
      continue;
    }
    if (c === '-' && i === firstNonSpace && /\s/.test(text[i + 1] ?? '')) {
      push('bullet', i, i + 1);
      i++;
      continue;
    }
    const single: Record<string, TokenType> = { ':': 'colon', ',': 'comma', '=': 'equals', '{': 'lbrace', '}': 'rbrace' };
    if (single[c]) {
      push(single[c], i, i + 1);
      i++;
      continue;
    }
    const rest = text.slice(i);
    let m: RegExpMatchArray | null;
    if (c === '@' && (m = rest.match(/^@(\d+)/))) {
      push('at', i, i + m[0].length, m[1]);
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(NUMBER))) {
      push('number', i, i + m[0].length);
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(IDENT))) {
      push('ident', i, i + m[0].length);
      i += m[0].length;
      continue;
    }
    m = rest.match(WORD);
    const len = m ? m[0].length : 1;
    push('word', i, i + len);
    i += len;
  }
  return out;
}

/** Tokenizes a whole source, one token list per line. */
export function tokenize(source: string): Token[][] {
  const lines = source.split('\n');
  const out: Token[][] = [];
  let offset = 0;
  lines.forEach((text, i) => {
    out.push(tokenizeLine(text, i + 1, offset));
    offset += text.length + 1;
  });
  return out;
}
