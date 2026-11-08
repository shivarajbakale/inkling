/**
 * Inkling for CodeMirror: highlighting from the core tokenizer (so the editor
 * and the parser always agree), lint from the parser's diagnostics, and
 * completions from the language's own word lists.
 */
import { autocompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { HighlightStyle, StreamLanguage, syntaxHighlighting, type StringStream } from '@codemirror/language';
import { linter, type Diagnostic as CmDiagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { hoverTooltip } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { COLORS, complete, hover, ICON_NAMES, parse, tokenizeLine, type CompletionKind, type Token } from '../../core';
import { KEYWORDS, SETTINGS, SHAPES, SHAPE_ALIASES } from '../../core/syntax/parser';
import { applyFix, fixLabel } from '../edits';

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
    case 'dots':
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

/** An underline needs at least one character: widen an empty span to the rest of its line. */
function underline(source: string, span: { from: number; to: number }) {
  let from = Math.min(span.from, source.length);
  let to = Math.min(span.to, source.length);
  if (to <= from) {
    const lineEnd = source.indexOf('\n', from);
    to = lineEnd === -1 ? source.length : lineEnd;
    if (to <= from && from > 0) from = from - 1;
  }
  return { from, to };
}

/** Parser diagnostics as CodeMirror diagnostics, with mechanical fixes as one-click actions. Related places are underlined too. */
export function lintSource(source: string): CmDiagnostic[] {
  return parse(source).diagnostics.flatMap((d) => {
    const fix = d.fix;
    const message = d.hint ? `${d.message} ${d.hint}` : d.message;
    const main: CmDiagnostic = {
      ...underline(source, d.span),
      severity: d.severity,
      message,
      source: d.code,
      actions: fix
        ? [
            {
              name: fixLabel(fix),
              apply: (view) => {
                const src = view.state.doc.toString();
                const next = applyFix(src, fix);
                view.dispatch({ changes: { from: 0, to: src.length, insert: next } });
              },
            },
          ]
        : undefined,
    };
    const also = (d.related ?? []).map((r) => ({ ...underline(source, r), severity: d.severity, message: `${message} (also line ${d.span.line})`, source: d.code }));
    return [main, ...also];
  });
}

/* ── Completions ─────────────────────────────────────────────────────────── */

const CM_TYPE: Record<CompletionKind, string> = { keyword: 'keyword', value: 'enum', shape: 'type', name: 'variable', option: 'property', color: 'enum', icon: 'type' };

/** CodeMirror completions from the core's `complete`. */
export function completeInkling(ctx: CompletionContext): CompletionResult | null {
  const r = complete(ctx.state.doc.toString(), ctx.pos, { explicit: ctx.explicit });
  if (!r) return null;
  const options: Completion[] = r.items.map((it) => ({
    label: it.label,
    type: CM_TYPE[it.kind],
    detail: it.detail,
    info: it.doc,
    apply: it.insert,
    boost: it.boost,
  }));
  return { from: r.from, options, validFor: /^[\w-]*$/ };
}

/* ── Hover ───────────────────────────────────────────────────────────────── */

/** The core's hover help as a tooltip: the example line, then what it does. */
const hoverHelp = hoverTooltip((view, pos) => {
  const h = hover(view.state.doc.toString(), pos);
  if (!h) return null;
  return {
    pos: h.from,
    end: h.to,
    above: true,
    create: () => {
      const dom = document.createElement('div');
      dom.className = 'cm-ink-hover';
      const m = h.text.match(/^```inkling\n([\s\S]*?)\n```\n?([\s\S]*)$/);
      const lead = m ? '' : h.text;
      if (m) {
        const code = document.createElement('pre');
        code.textContent = m[1];
        dom.appendChild(code);
      }
      const p = document.createElement('div');
      p.textContent = (m ? m[2] : lead).replace(/\*\*|`/g, '');
      dom.appendChild(p);
      return { dom };
    },
  };
});

export function inkling(): Extension[] {
  return [
    inklingLanguage,
    syntaxHighlighting(style),
    linter((view) => lintSource(view.state.doc.toString()), { delay: 250 }),
    autocompletion({ override: [completeInkling], icons: false }),
    hoverHelp,
  ];
}
