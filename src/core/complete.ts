/**
 * Editor help that works in any editor: completion, hover, symbols and
 * go-to-definition. Framework-free; the playground's CodeMirror extension
 * and the language server (bin/inkling-lsp.mjs) are thin adapters over it.
 */
import { ICON_NAMES } from './icons';
import { COLORS, HANDS, INKS, LAYOUT_NAMES, PAPERS, PENS, SIZES } from './styles';
import { DEPRECATED, EDGE_OPTIONS, KEYWORDS, LAYOUT_WORDS, MARKS, NODE_OPTIONS, parse, SETTINGS, SHAPES, SHAPE_ALIASES } from './syntax/parser';
import { lookup } from './syntax/reference';
import { tokenizeLine, type Token } from './syntax/tokens';
import type { Doc, Span } from './types';

export type CompletionKind = 'keyword' | 'value' | 'shape' | 'name' | 'option' | 'color' | 'icon';

export interface CompletionItem {
  label: string;
  kind: CompletionKind;
  /** A short note shown beside the label, such as a paper's full name. */
  detail?: string;
  /** Longer help, from the language reference. */
  doc?: string;
  /** Text to insert when it differs from the label (quoted square names). */
  insert?: string;
  /** Higher sorts first: the file's own layout words, then the rest. */
  boost?: number;
}

export interface Completions {
  /** The range the chosen item replaces: the word typed so far. */
  from: number;
  to: number;
  items: CompletionItem[];
}

export interface CompleteOptions {
  /** The user asked for completions (Ctrl-Space). Without it, nothing is offered where the next word isn't clear. */
  explicit?: boolean;
}

const items = (list: string[], kind: CompletionKind, detail?: (v: string) => string | undefined): CompletionItem[] =>
  list.map((label) => ({ label, kind, detail: detail?.(label) }));

/** Values a setting takes, by setting name. */
const SETTING_VALUES: Record<string, () => CompletionItem[]> = {
  paper: () => items(Object.keys(PAPERS), 'value', (k) => PAPERS[k].label),
  pen: () => items(Object.keys(PENS), 'value', (k) => PENS[k].label),
  hand: () => items(Object.keys(HANDS), 'value', (k) => HANDS[k].label),
  layout: () => items(LAYOUT_NAMES, 'value', (k) => lookup(`layout:${k}`)?.what.split('.')[0]),
  direction: () => items(['right', 'down'], 'value'),
  steps: () => items(['auto'], 'value'),
  branches: () => items(['elbow', 'straight'], 'value'),
  footer: () => items(['on', 'off'], 'value'),
  colors: () => items(['on', 'off'], 'value'),
};

/** Values a key=value option takes. */
const OPTION_VALUES: Record<string, () => string[]> = {
  color: () => Object.keys(INKS),
  fill: () => Object.keys(COLORS),
  pen: () => Object.keys(PENS),
  size: () => Object.keys(SIZES),
  icon: () => ICON_NAMES,
};

/** The line around `offset`: its text, where it starts, and the part before the cursor. */
function lineAt(source: string, offset: number) {
  const start = source.lastIndexOf('\n', offset - 1) + 1;
  const endAt = source.indexOf('\n', offset);
  const end = endAt === -1 ? source.length : endAt;
  return { start, end, text: source.slice(start, end), before: source.slice(start, offset), number: source.slice(0, start).split('\n').length };
}

/** Ids a mark, arrow or step can name. */
function names(doc: Doc): CompletionItem[] {
  const seen = new Set<string>();
  const out: CompletionItem[] = [];
  for (const n of doc.nodes)
    if (!seen.has(n.id) && /^[A-Za-z_][\w-]*$/.test(n.id) && !n.cell) {
      seen.add(n.id);
      out.push({ label: n.id, kind: 'name', detail: n.label && n.label !== n.id ? n.label.replace(/\n/g, ' ') : undefined });
    }
  for (const g of doc.groups)
    if (!seen.has(g.id)) {
      seen.add(g.id);
      out.push({ label: g.id, kind: 'name', detail: `group ${g.label}` });
    }
  return out;
}

/** Statement words, with the file's own layout words first and other layouts' words last. */
function keywords(layout: string): CompletionItem[] {
  return [...new Set(KEYWORDS)]
    .filter((k) => k !== 'inkling' && !DEPRECATED[k])
    .map((k) => {
      const where = LAYOUT_WORDS[k];
      const r = lookup(`kw:${k}`);
      return { label: k, kind: 'keyword' as const, detail: where ? `layout ${where.join(' / ')}` : undefined, doc: r?.what, boost: where ? (where.includes(layout) ? 2 : -1) : 0 };
    });
}

/** What can be typed at `offset`. Null when nothing fits. */
export function complete(source: string, offset: number, options: CompleteOptions = {}): Completions | null {
  const line = lineAt(source, offset);
  const word = line.before.match(/[\w-]*$/)![0];
  const from = offset - word.length;
  const head = line.before.slice(0, line.before.length - word.length);
  const all = tokenizeLine(line.before, 1, 0);
  if (all.some((t) => t.type === 'comment') || all.some((t) => t.type === 'string' && t.error)) return null;
  const toks = tokenizeLine(head, 1, 0).filter((t) => t.type !== 'comment');
  let parsed: Doc | undefined;
  const doc = () => (parsed ??= parse(source));
  const result = (list: CompletionItem[]): Completions | null => (list.length ? { from, to: offset, items: list } : null);

  const last = toks[toks.length - 1] as Token | undefined;
  const first = toks[0] as Token | undefined;
  const inList = (() => {
    // After `in`, or after `&` in an `in a & b` list.
    const k = toks.map((t) => t.type === 'ident' && t.value === 'in').lastIndexOf(true);
    if (k === -1) return undefined;
    const tail = toks.slice(k + 1);
    if (!tail.length) return { named: [] as string[] };
    if (last?.type === 'word' && /^&+$/.test(last.text)) return { named: tail.filter((t) => t.type === 'ident').map((t) => t.value) };
    return undefined;
  })();
  const markWord = first?.type === 'ident' && (MARKS as string[]).includes(first.value) ? first.value : undefined;

  // With nothing typed yet, only offer where the next word is clear.
  if (!word && !options.explicit) {
    const clear =
      !!last &&
      (last.type === 'equals' ||
        (toks.length === 1 && first?.type === 'ident' && !!SETTING_VALUES[first.value]) ||
        (toks.length === 2 && last.type === 'colon') ||
        (!!inList && (doc().layout === 'venn' || doc().layout === 'quadrant')));
    if (!clear) return null;
  }

  // Start of a line: statement words, then names.
  if (!toks.length) return result([...keywords(doc().layout), ...names(doc())]);

  // key=value
  if (last!.type === 'equals' && toks[toks.length - 2]?.type === 'ident') return result(items(OPTION_VALUES[toks[toks.length - 2].value]?.() ?? [], 'value'));

  // A setting's value: paper …, layout …, branches …
  if (toks.length === 1 && first!.type === 'ident' && SETTING_VALUES[first!.value]) return result(SETTING_VALUES[first!.value]());

  // A shape after `id:`.
  if (toks.length === 2 && last!.type === 'colon' && (first!.type === 'ident' || first!.type === 'string'))
    return result([...items(SHAPES, 'shape', (s) => (s === 'icon' ? 'then an icon name' : undefined)), ...items(Object.keys(COLORS), 'color', () => 'fill')]);

  if (last!.type === 'ident' && last!.value === 'icon') return result(items(ICON_NAMES, 'icon'));

  // Venn sets and quadrant squares after `in`.
  if (inList) {
    const d = doc();
    if (d.layout === 'venn') return result(items(d.sets.filter((s) => !inList.named.includes(s)), 'name', (s) => d.nodes.find((n) => n.id === s)?.label));
    if (d.layout === 'quadrant' && !inList.named.length) return result(d.quadrants.map((q) => ({ label: q, kind: 'name' as const, insert: `"${q}"` })));
  }

  // Names: after an arrow, a mark word, a step's colon or comma, note over, activate.
  const listOfNames = (first!.value === 'step' || first!.value === 'cycle' || (first!.value === 'note' && toks[1]?.value === 'over')) && (last!.type === 'colon' || last!.type === 'comma' || last!.value === 'over' || (first!.value === 'cycle' && toks.length === 1));
  if (last!.type === 'arrow' || (markWord && toks.length === 1) || listOfNames || ((first!.value === 'activate' || first!.value === 'deactivate') && toks.length === 1)) {
    const d = doc();
    const regions =
      markWord && d.layout === 'venn' && (markWord === 'highlight' || markWord === 'circle')
        ? d.sets.flatMap((a, i) => d.sets.slice(i + 1).map((b) => ({ label: `${a}&${b}`, kind: 'name' as const, detail: 'overlap' })))
        : [];
    return result([...names(d), ...regions]);
  }

  if (markWord === 'highlight' && toks.length === 2) return result(items(Object.keys(COLORS), 'color'));

  // After a node's label: a fill colour or an option.
  const isDef = toks[1]?.type === 'colon' && !toks.some((t) => t.type === 'arrow');
  if (isDef && toks.length >= 3)
    return result([
      ...items(Object.keys(COLORS), 'color', () => 'fill'),
      ...NODE_OPTIONS.map((o) => ({ label: `${o}=`, kind: 'option' as const, doc: lookup(`opt:${o}`)?.what })),
    ]);
  if (toks.some((t) => t.type === 'arrow') && last!.type !== 'colon') return result(EDGE_OPTIONS.map((o) => ({ label: `${o}=`, kind: 'option' as const, doc: lookup(`opt:${o}`)?.what })));
  return null;
}

export interface Hover {
  from: number;
  to: number;
  /** Markdown: a code line, then what it does. */
  text: string;
}

const show = (code: string, what: string) => `\`\`\`inkling\n${code}\n\`\`\`\n${what}`;

/** Help for the word at `offset`: a statement, shape, option, setting value or node. */
export function hover(source: string, offset: number): Hover | null {
  const line = lineAt(source, offset);
  const toks = tokenizeLine(line.text, line.number, line.start).filter((t) => t.type !== 'comment');
  const i = toks.findIndex((t) => offset >= t.from && offset <= t.to && t.type !== 'comma');
  if (i === -1) return null;
  const t = toks[i];
  const out = (text: string | undefined): Hover | null => (text ? { from: t.from, to: t.to, text } : null);
  const fromRow = (key: string) => {
    const r = lookup(key);
    return r ? show(r.code, r.what) : undefined;
  };
  const first = toks[0];
  const prev = toks[i - 1];
  const next = toks[i + 1];
  const isArrowLine = toks.some((x) => x.type === 'arrow');

  if (t.type === 'arrow') return out(fromRow(`arrow:${t.value}`));
  if (i === 1 && first.value === 'note' && t.value === 'over') return out(fromRow('kw:note over'));
  // A statement word.
  if (i === 0 && t.type === 'ident' && (KEYWORDS as string[]).includes(t.value) && next?.type !== 'colon' && next?.type !== 'arrow') {
    if (t.value === 'layout') return out(show('layout flow', `Picks how things are placed: ${LAYOUT_NAMES.join(', ')}. Or right / down for the direction.`));
    if (t.value === 'note' && next?.value === 'over') return out(fromRow('kw:note over'));
    const old = DEPRECATED[t.value];
    if (old) return out(`\`${t.value}\` is the old name for \`${old.use}\` (deprecated in ${old.since}). It still works.\n\n${fromRow(`kw:${old.use}`)}`);
    return out(fromRow(`kw:${t.value}`));
  }
  // A setting's value.
  if (i === 1 && first.type === 'ident' && (SETTINGS as readonly string[]).includes(first.value)) {
    const v = t.value;
    if (first.value === 'layout') return out(fromRow(`layout:${v}`));
    if (first.value === 'paper' && PAPERS[v]) return out(`**${PAPERS[v].label}** paper.\n\n${fromRow('kw:paper')}`);
    if (first.value === 'pen' && PENS[v]) return out(`**${PENS[v].label}** pen.\n\n${fromRow('kw:pen')}`);
    if (first.value === 'hand' && HANDS[v]) return out(`**${HANDS[v].label}** handwriting.\n\n${fromRow('kw:hand')}`);
    return out(fromRow(`kw:${first.value}`));
  }
  // An option key, or its value.
  if (t.type === 'ident' && next?.type === 'equals') return out(fromRow(`opt:${t.value}`));
  // A shape after `id:`.
  if (t.type === 'ident' && prev?.type === 'colon' && !isArrowLine && (SHAPES as string[]).concat(Object.keys(SHAPE_ALIASES)).includes(t.value)) {
    const alias = SHAPE_ALIASES[t.value];
    return out(`${alias ? `\`${t.value}\` is another name for \`${alias}\`.\n\n` : ''}${fromRow(`shape:${t.value}`)}`);
  }
  // A colour.
  if (t.type === 'ident' && COLORS[t.value] && i > 1) return out(`The colour **${t.value}**.`);
  // A node or group name: where it is defined.
  if (t.type === 'ident' || t.type === 'string') {
    const doc = parse(source);
    const n = doc.nodes.find((x) => x.id === t.value);
    if (n) {
      const def = source.slice(n.span.from, n.span.to).split('\n')[0];
      return out(`${show(def, `${n.implicit ? 'Not defined, so drawn as a box.' : `Defined on line ${n.line}.`}`)}`);
    }
    const g = doc.groups.find((x) => x.id === t.value);
    if (g) return out(show(source.slice(g.span.from, g.span.to), `A group with ${g.members.length} member${g.members.length === 1 ? '' : 's'}, defined on line ${g.line}.`));
  }
  return null;
}

export type SymbolKind = 'node' | 'group' | 'step' | 'set' | 'frame';

export interface DocSymbol {
  name: string;
  kind: SymbolKind;
  /** The label, or a step's caption. */
  detail?: string;
  span: Span;
}

/** Nodes, groups, sets, frames and steps, in source order, for outline views. */
export function symbols(source: string): DocSymbol[] {
  const doc = parse(source);
  const out: DocSymbol[] = [
    ...doc.nodes.filter((n) => !n.implicit && !n.cell).map((n) => ({ name: n.id, kind: (n.role === 'set' ? 'set' : 'node') as SymbolKind, detail: n.label.replace(/\n/g, ' ') || undefined, span: n.span })),
    ...doc.groups.map((g) => ({ name: g.id, kind: 'group' as const, detail: g.label, span: g.span })),
    ...doc.frames.map((f) => ({ name: f.kind, kind: 'frame' as const, detail: f.branches[0]?.label, span: f.span })),
    ...doc.steps.map((s) => ({ name: `step ${s.index}`, kind: 'step' as const, detail: s.caption, span: s.span })),
  ];
  return out.sort((a, b) => a.span.from - b.span.from);
}

/** Where the name at `offset` is defined: a node's definition line, or a group's. */
export function definition(source: string, offset: number): Span | null {
  const line = lineAt(source, offset);
  const t = tokenizeLine(line.text, line.number, line.start).find((x) => offset >= x.from && offset <= x.to && (x.type === 'ident' || x.type === 'string'));
  if (!t) return null;
  const doc = parse(source);
  const n = doc.nodes.find((x) => x.id === t.value);
  if (n) return n.span;
  const g = doc.groups.find((x) => x.id === t.value);
  return g ? g.span : null;
}
