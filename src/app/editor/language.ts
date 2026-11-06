/**
 * Inkling for CodeMirror: highlighting from the core tokenizer (so the editor
 * and the parser always agree), lint from the parser's diagnostics, and
 * completions from the language's own word lists.
 */
import { autocompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { HighlightStyle, StreamLanguage, syntaxHighlighting, type StringStream } from '@codemirror/language';
import { linter, type Diagnostic as CmDiagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { tags as t } from '@lezer/highlight';
import { COLORS, HANDS, ICON_NAMES, LAYOUTS, PAPERS, PENS, parse, tokenizeLine, type Token } from '../../core';
import { INKS, SIZES } from '../../core/styles';
import { EDGE_OPTIONS, KEYWORDS, MARKS, NODE_OPTIONS, SETTINGS, SHAPES, SHAPE_ALIASES } from '../../core/syntax/parser';
import { applyFix } from '../edits';

/* ── Highlighting ────────────────────────────────────────────────────────── */

interface LineState {
  toks: Token[];
  i: number;
}

/** The highlight class of token `i` in a line, from where it sits. */
export function classify(toks: Token[], i: number): string | null {
  const tk = toks[i];
  const prev = toks[i - 1];
  const next = toks[i + 1];
  const colonAt = toks.findIndex((x) => x.type === 'colon');
  const isArrowLine = toks.slice(0, colonAt === -1 ? undefined : colonAt).some((x) => x.type === 'arrow');
  switch (tk.type) {
    case 'comment':
      return 'comment';
    case 'string':
      return i === 0 && next?.type === 'colon' ? 'variableName.definition' : 'string';
    case 'number':
      return 'number';
    case 'at':
      return 'labelName';
    case 'arrow':
      return 'operator';
    case 'colon':
    case 'comma':
    case 'equals':
    case 'bullet':
      return 'punctuation';
    case 'lbrace':
    case 'rbrace':
      return 'brace';
    case 'word':
      return isArrowLine && colonAt !== -1 && i > colonAt ? 'string' : null;
    case 'ident': {
      if (isArrowLine && colonAt !== -1 && i > colonAt && next?.type !== 'equals' && prev?.type !== 'equals') return 'string';
      if (next?.type === 'equals') return 'propertyName';
      if (prev?.type === 'equals') return 'atom';
      if (i === 0 && next?.type === 'colon') return 'variableName.definition';
      if (i === 0 && (KEYWORDS as string[]).includes(tk.value) && next?.type !== 'arrow') return 'keyword';
      if (i === 1 && (SETTINGS as readonly string[]).includes(toks[0].value) && toks[0].type === 'ident') return 'atom';
      if (prev?.type === 'colon' && !isArrowLine && (SHAPES as string[]).concat(Object.keys(SHAPE_ALIASES)).includes(tk.value)) return 'typeName';
      if (prev?.value === 'icon' && ICON_NAMES.includes(tk.value)) return 'typeName';
      if (COLORS[tk.value] && i > 1) return 'atom';
      return 'variableName';
    }
  }
}

export const inklingLanguage = StreamLanguage.define<LineState>({
  name: 'inkling',
  startState: () => ({ toks: [], i: 0 }),
  copyState: (s) => ({ toks: s.toks, i: s.i }),
  token(stream: StringStream, state: LineState) {
    if (stream.sol()) {
      state.toks = tokenizeLine(stream.string, 1, 0);
      state.i = 0;
    }
    while (state.i < state.toks.length && state.toks[state.i].to <= stream.pos) state.i++;
    const tk = state.toks[state.i];
    if (!tk) {
      stream.skipToEnd();
      return null;
    }
    if (tk.from > stream.pos) {
      stream.pos = tk.from;
      return null;
    }
    stream.pos = tk.to;
    return classify(state.toks, state.i);
  },
  languageData: { commentTokens: { line: '#' } },
});

/** Colours come from Mantine's palette through CSS variables, set for light and dark in global.css. */
const style = HighlightStyle.define([
  { tag: t.keyword, color: 'var(--ink-code-keyword)', fontWeight: '600' },
  { tag: t.definition(t.variableName), color: 'var(--ink-code-def)' },
  { tag: t.variableName, color: 'var(--ink-code-name)' },
  { tag: t.typeName, color: 'var(--ink-code-type)' },
  { tag: t.string, color: 'var(--ink-code-string)' },
  { tag: [t.number, t.labelName], color: 'var(--ink-code-number)' },
  { tag: t.atom, color: 'var(--ink-code-atom)' },
  { tag: t.propertyName, color: 'var(--ink-code-property)' },
  { tag: t.operator, color: 'var(--ink-code-operator)', fontWeight: '600' },
  { tag: [t.punctuation, t.brace], color: 'var(--ink-code-punct)' },
  { tag: t.comment, color: 'var(--ink-code-comment)', fontStyle: 'italic' },
]);

/* ── Lint ────────────────────────────────────────────────────────────────── */

/** Parser diagnostics as CodeMirror diagnostics, with "did you mean" as a one-click fix. */
export function lintSource(source: string): CmDiagnostic[] {
  return parse(source).diagnostics.map((d) => {
    let from = Math.min(d.span.from, source.length);
    let to = Math.min(d.span.to, source.length);
    if (to <= from) {
      // An empty span still needs something to underline: use the rest of its line.
      const lineEnd = source.indexOf('\n', from);
      to = lineEnd === -1 ? source.length : lineEnd;
      if (to <= from && from > 0) from = from - 1;
    }
    const fix = d.fix;
    return {
      from,
      to,
      severity: d.severity,
      message: d.hint ? `${d.message} ${d.hint}` : d.message,
      source: d.code,
      actions: fix
        ? [
            {
              name: `Change to "${fix.text}"`,
              apply: (view) => {
                const src = view.state.doc.toString();
                const next = applyFix(src, fix);
                view.dispatch({ changes: { from: 0, to: src.length, insert: next } });
              },
            },
          ]
        : undefined,
    };
  });
}

/* ── Completions ─────────────────────────────────────────────────────────── */

const opts = (list: string[], type: string, detail?: (v: string) => string | undefined): Completion[] =>
  list.map((label) => ({ label, type, detail: detail?.(label) }));

const listFor: Record<string, () => Completion[]> = {
  paper: () => opts(Object.keys(PAPERS), 'enum', (k) => PAPERS[k].label),
  pen: () => opts(Object.keys(PENS), 'enum', (k) => PENS[k].label),
  hand: () => opts(Object.keys(HANDS), 'enum', (k) => HANDS[k].label),
  layout: () => opts(Object.keys(LAYOUTS), 'enum'),
  direction: () => opts(['right', 'down'], 'enum'),
  steps: () => opts(['auto'], 'enum'),
};

const optionValues: Record<string, () => string[]> = {
  color: () => Object.keys(INKS),
  fill: () => Object.keys(COLORS),
  pen: () => Object.keys(PENS),
  size: () => Object.keys(SIZES),
  icon: () => ICON_NAMES,
};

/** What can be typed at the cursor, given the line so far. */
export function completeInkling(ctx: CompletionContext): CompletionResult | null {
  const line = ctx.state.doc.lineAt(ctx.pos);
  const before = line.text.slice(0, ctx.pos - line.from);
  const word = ctx.matchBefore(/[\w-]*$/);
  if (!word) return null;
  const toks = tokenizeLine(before.slice(0, word.from - line.from), 1, 0).filter((x) => x.type !== 'comment');
  if (/#/.test(before) && tokenizeLine(before, 1, 0).some((x) => x.type === 'comment')) return null;
  if (toks.some((x) => x.type === 'string' && x.error)) return null;
  const ids = () => {
    const doc = parse(ctx.state.doc.toString());
    return opts([...new Set([...doc.nodes.map((n) => n.id), ...doc.groups.map((g) => g.id)])].filter((id) => /^[A-Za-z_][\w-]*$/.test(id)), 'variable');
  };
  const result = (options: Completion[]): CompletionResult | null =>
    options.length ? { from: word.from, options, validFor: /^[\w-]*$/ } : null;

  const last = toks[toks.length - 1];
  const first = toks[0];
  // With nothing typed yet, only offer where the next word is clear: a value after = or a setting, or a shape.
  if (word.from === word.to && !ctx.explicit) {
    const clear = last && (last.type === 'equals' || (toks.length === 1 && listFor[first.value]) || (toks.length === 2 && last.type === 'colon'));
    if (!clear) return null;
  }
  // Start of a line: keywords and names.
  if (!toks.length) {
    return result([
      ...opts([...KEYWORDS].filter((k) => k !== 'inkling'), 'keyword'),
      ...ids(),
    ]);
  }
  // key=value options
  if (last.type === 'equals' && toks[toks.length - 2]?.type === 'ident') {
    const key = toks[toks.length - 2].value;
    return result(opts(optionValues[key]?.() ?? [], 'enum'));
  }
  // Settings: paper …, pen …, layout …
  if (toks.length === 1 && first.type === 'ident' && listFor[first.value]) return result(listFor[first.value]());
  // Shapes after `id:`
  if (toks.length === 2 && toks[1].type === 'colon' && (first.type === 'ident' || first.type === 'string')) {
    return result([...opts(SHAPES, 'type'), ...opts(Object.keys(COLORS), 'enum', () => 'fill')]);
  }
  // Icon names after `icon`
  if (last.type === 'ident' && last.value === 'icon') return result(opts(ICON_NAMES, 'type'));
  // Names after an arrow, a mark word, a step, or a comma in a list.
  const isMark = first.type === 'ident' && (MARKS as string[]).includes(first.value);
  if (last.type === 'arrow' || (isMark && toks.length === 1) || (first.value === 'step' && (last.type === 'colon' || last.type === 'comma'))) return result(ids());
  // A highlight's colour
  if (isMark && first.value === 'highlight' && toks.length === 2) return result(opts(Object.keys(COLORS), 'enum'));
  // After a node's label: a fill colour or an option.
  const isDef = toks[1]?.type === 'colon' && !toks.some((x) => x.type === 'arrow');
  if (isDef && toks.length >= 3) return result([...opts(Object.keys(COLORS), 'enum', () => 'fill'), ...opts(NODE_OPTIONS.map((o) => `${o}=`), 'property')]);
  if (toks.some((x) => x.type === 'arrow') && last.type !== 'colon') return result(opts(EDGE_OPTIONS.map((o) => `${o}=`), 'property'));
  return null;
}

export function inkling(): Extension[] {
  return [
    inklingLanguage,
    syntaxHighlighting(style),
    linter((view) => lintSource(view.state.doc.toString()), { delay: 250 }),
    autocompletion({ override: [completeInkling], icons: false }),
  ];
}
