/**
 * Every change the playground makes to the source, other than typing, goes
 * through here: pure functions `(source, action) => newSource`. Text stays
 * the single source of truth, so a drag, an inline label edit or a menu
 * command is just another rewrite of the text.
 */
import { format, parse, setDirective, tokenizeLine, type Token } from '../core';
import { MARKS, SHAPE_ALIASES, SHAPES } from '../core/syntax/parser';

export type MarkKind = 'circle' | 'highlight' | 'check' | 'cross' | 'underline' | 'strike';

export interface Preset {
  id: string;
  label: string;
  paper: string;
  pen: string;
  hand: string;
  mess: number;
}

export const PRESETS: Preset[] = [
  { id: 'teacher', label: 'Teacher', paper: 'notebook', pen: 'ballpoint', hand: 'caveat', mess: 0.45 },
  { id: 'engineer', label: 'Engineer', paper: 'graph', pen: 'pencil', hand: 'kalam', mess: 0.3 },
  { id: 'chalk', label: 'Chalk talk', paper: 'chalkboard', pen: 'chalk', hand: 'kalam', mess: 0.5 },
  { id: 'napkin', label: 'Napkin', paper: 'napkin', pen: 'marker', hand: 'gochi', mess: 0.6 },
  { id: 'whiteboard', label: 'Whiteboard', paper: 'whiteboard', pen: 'marker', hand: 'patrick', mess: 0.35 },
];

export type EditAction =
  | { type: 'nodeLabel'; id: string; text: string }
  | { type: 'edgeLabel'; index: number; text: string }
  | { type: 'position'; id: string; x: number; y: number }
  | { type: 'toggleMark'; mark: MarkKind; id: string }
  | { type: 'addNote'; id: string; text: string }
  | { type: 'deleteNode'; id: string }
  | { type: 'fix'; fix: { span: { from: number; to: number }; text: string } }
  | { type: 'setting'; key: string; value: string | number }
  | { type: 'preset'; preset: string }
  | { type: 'format' };

export function applyEdit(source: string, action: EditAction): string {
  switch (action.type) {
    case 'nodeLabel':
      return setNodeLabel(source, action.id, action.text);
    case 'edgeLabel':
      return setEdgeLabel(source, action.index, action.text);
    case 'position':
      return setPosition(source, action.id, action.x, action.y);
    case 'toggleMark':
      return toggleMark(source, action.mark, action.id);
    case 'addNote':
      return addNote(source, action.id, action.text);
    case 'deleteNode':
      return deleteNode(source, action.id);
    case 'fix':
      return applyFix(source, action.fix);
    case 'setting':
      return setDirective(source, action.key, action.value);
    case 'preset':
      return applyPreset(source, action.preset);
    case 'format':
      return format(source);
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const IDENT = /^[A-Za-z_][\w]*(?:-[\w]+)*$/;
const SHAPE_WORDS = new Set<string>([...SHAPES, ...Object.keys(SHAPE_ALIASES)]);

/** Text in Inkling quotes, escaped. */
export function quote(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

/** A name as it must be written: bare when it can be, quoted otherwise. */
export function ref(id: string): string {
  return IDENT.test(id) ? id : quote(id);
}

interface Line {
  text: string;
  /** Tokens without the comment, with column positions. */
  toks: Token[];
  comment?: Token;
  indent: string;
}

function readLine(text: string): Line {
  const all = tokenizeLine(text, 1, 0);
  return {
    text,
    toks: all.filter((t) => t.type !== 'comment'),
    comment: all.find((t) => t.type === 'comment'),
    indent: text.match(/^\s*/)![0],
  };
}

/** Where trailing `key=value` options start in a token list. */
function optionsStart(toks: Token[], from: number): number {
  let end = toks.length;
  while (end - 3 >= from && toks[end - 2].type === 'equals' && toks[end - 3].type === 'ident') end -= 3;
  return end;
}

/** Removes column ranges from a line, with the space before each. */
function cut(text: string, ranges: [number, number][]): string {
  let out = text;
  for (const [a, b] of [...ranges].sort((x, y) => y[0] - x[0])) {
    let s = a;
    while (s > 0 && out[s - 1] === ' ') s--;
    out = out.slice(0, s) + out.slice(b);
  }
  return out;
}

const insertAt = (text: string, col: number, piece: string) => text.slice(0, col) + piece + text.slice(col);

/** Replaces line `n` (1-based) with zero or more lines. */
function replaceLine(source: string, n: number, next: string[]): string {
  const lines = source.split('\n');
  lines.splice(n - 1, 1, ...next);
  return lines.join('\n');
}

/** Adds a line at the end, keeping one trailing newline if there was one. */
function appendLine(source: string, line: string): string {
  const trimmed = source.replace(/\n+$/, '');
  return (trimmed ? trimmed + '\n' : '') + line + '\n';
}

/** The 0-based line that defines `id` as  id: …, or -1. */
function findDefinition(lines: string[], id: string): number {
  return lines.findIndex((text) => {
    const [t0, t1] = readLine(text).toks;
    return !!t0 && (t0.type === 'ident' || t0.type === 'string') && t0.value === id && t1?.type === 'colon';
  });
}

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Sets a node's label. A node made by an arrow gets its own definition line. */
export function setNodeLabel(source: string, id: string, text: string): string {
  const doc = parse(source);
  const node = doc.nodes.find((n) => n.id === id);
  if (!node) return source;
  const lines = source.split('\n');
  if (node.implicit) {
    if (!text) return source;
    const host = readLine(lines[node.line - 1]);
    return replaceLine(source, node.line, [`${host.indent}${ref(id)}: ${quote(text)}`, host.text]);
  }
  const L = readLine(lines[node.line - 1]);
  const colon = L.toks.findIndex((t) => t.type === 'colon');
  if (colon < 0) return source;
  const end = optionsStart(L.toks, colon + 1);
  const body = L.toks.slice(colon + 1, end);
  const label = body.find((t) => t.type === 'string');
  let next: string;
  if (label) {
    next = text ? L.text.slice(0, label.from) + quote(text) + L.text.slice(label.to) : cut(L.text, [[label.from, label.to]]);
  } else {
    if (!text) return source;
    // After the shape word (and an icon name), or straight after the colon.
    let after = L.toks[colon];
    if (body[0]?.type === 'ident' && SHAPE_WORDS.has(body[0].value)) {
      after = body[0];
      if (body[0].value === 'icon' && body[1]?.type === 'ident') after = body[1];
    }
    next = insertAt(L.text, after.to, ` ${quote(text)}`);
  }
  return replaceLine(source, node.line, [next]);
}

/** Sets the label on an arrow. Only the last arrow of a chain carries a label. */
export function setEdgeLabel(source: string, index: number, text: string): string {
  const doc = parse(source);
  const edge = doc.edges[index];
  if (!edge) return source;
  const onLine = doc.edges.filter((e) => e.line === edge.line);
  if (onLine[onLine.length - 1] !== edge) return source;
  const lines = source.split('\n');
  const L = readLine(lines[edge.line - 1]);
  const colon = L.toks.findIndex((t) => t.type === 'colon');
  const stop = L.comment ? L.comment.from : L.text.length;
  let next: string;
  if (colon >= 0) {
    const after = L.toks.slice(colon + 1);
    let labelEnd: number;
    if (after[0]?.type === 'string') labelEnd = after[0].to;
    else {
      const optAt = optionsStart(L.toks, colon + 1);
      labelEnd = optAt < L.toks.length ? L.toks[optAt].from : stop;
    }
    const tail = L.text.slice(labelEnd).replace(/^\s+/, '');
    const headEnd = L.toks[colon - 1]?.to ?? L.toks[colon].from;
    next = L.text.slice(0, headEnd) + (text ? ` : ${quote(text)}` : '') + (tail ? ` ${tail}` : '');
  } else {
    if (!text) return source;
    const last = L.toks[L.toks.length - 1];
    next = insertAt(L.text, last.to, ` : ${quote(text)}`);
  }
  return replaceLine(source, edge.line, [next.replace(/\s+$/, '')]);
}

/* ── Placement ───────────────────────────────────────────────────────────── */

/**
 * Writes `at x,y` for a node, as the free layout reads it. Replaces an
 * existing `at`, or a relative placement such as `below api gap=80`.
 */
export function setPosition(source: string, id: string, x: number, y: number): string {
  const at = `at ${Math.round(x)},${Math.round(y)}`;
  const lines = source.split('\n');
  // Found by tokens, not by parsing: this core may not read `at` yet.
  const defAt = findDefinition(lines, id);
  if (defAt < 0) {
    const node = parse(source).nodes.find((n) => n.id === id);
    if (!node) return source;
    const host = readLine(lines[node.line - 1]);
    return replaceLine(source, node.line, [`${host.indent}${ref(id)}: box ${at}`, host.text]);
  }
  const node = { line: defAt + 1 };
  const L = readLine(lines[defAt]);
  const colon = 1;
  const optAt = optionsStart(L.toks, colon + 1);
  const body = L.toks.slice(colon + 1, optAt);
  const remove: [number, number][] = [];
  const word = (t: Token | undefined, w: string) => t?.type === 'ident' && t.value === w;
  for (let i = 0; i < body.length; i++) {
    const t = body[i];
    if (word(t, 'at') && body[i + 2]?.type === 'comma') {
      remove.push([t.from, body[i + 3]?.to ?? body[i + 2].to]);
      i += 3;
    } else if ((word(t, 'below') || word(t, 'above')) && body[i + 1]) {
      remove.push([t.from, body[i + 1].to]);
      i += 1;
    } else if ((word(t, 'left') || word(t, 'right')) && word(body[i + 1], 'of') && body[i + 2]) {
      remove.push([t.from, body[i + 2].to]);
      i += 2;
    }
  }
  for (let k = optAt; k + 2 < L.toks.length; k += 3) if (word(L.toks[k], 'gap')) remove.push([L.toks[k].from, L.toks[k + 2].to]);
  const kept = body.filter((t) => !remove.some(([a, b]) => t.from >= a && t.to <= b));
  const anchor = kept.length ? kept[kept.length - 1].to : L.toks[colon].to;
  // Insert first (to the right of nothing we remove before it), then cut.
  const shifted = remove.map(([a, b]): [number, number] => (a >= anchor ? [a + at.length + 1, b + at.length + 1] : [a, b]));
  const next = cut(insertAt(L.text, anchor, ` ${at}`), shifted);
  return replaceLine(source, node.line, [next.replace(/\s+$/, '')]);
}

/* ── Marks and notes ─────────────────────────────────────────────────────── */

/** Lines (1-based) holding a mark of this kind on this target. */
function markLines(source: string, mark: string, id: string): number[] {
  return parse(source)
    .annotations.filter((a) => a.kind === mark && a.target === id && a.targetKind !== 'edge')
    .map((a) => a.line);
}

export function hasMark(source: string, mark: MarkKind, id: string): boolean {
  return markLines(source, mark, id).length > 0;
}

/** Adds `circle api`, or removes it if it is already there. */
export function toggleMark(source: string, mark: MarkKind, id: string): string {
  const found = markLines(source, mark, id);
  if (found.length) {
    const lines = source.split('\n');
    return lines.filter((_, i) => !found.includes(i + 1)).join('\n');
  }
  return appendLine(source, `${mark} ${ref(id)}`);
}

export function addNote(source: string, id: string, text: string): string {
  return appendLine(source, `note ${ref(id)} ${quote(text || 'note')}`);
}

/* ── Deleting a node ─────────────────────────────────────────────────────── */

/**
 * Deletes a node: its definition, every arrow that touches it (splitting a
 * chain where needed), marks on it, and its mentions in steps and groups.
 * Nodes that only existed because of a deleted arrow go too, with their marks.
 */
export function deleteNode(source: string, id: string): string {
  const before = parse(source);
  if (!before.nodes.some((n) => n.id === id)) return source;
  let out = scrub(source, new Set([id]));
  const gone = new Set([id]);
  for (let pass = 0; pass < 5; pass++) {
    const left = new Set(parse(out).nodes.map((n) => n.id));
    const vanished = new Set(before.nodes.map((n) => n.id).filter((n) => !left.has(n) && !gone.has(n)));
    if (!vanished.size) break;
    vanished.forEach((v) => gone.add(v));
    out = scrub(out, vanished);
  }
  return out;
}

/** Removes every line or part of a line that names one of `ids`. Works on tokens, so it needs no valid parse. */
function scrub(source: string, ids: Set<string>): string {
  const named = (t: Token | undefined) => !!t && (t.type === 'ident' || t.type === 'string') && ids.has(t.value);
  const lines = source.split('\n');
  const out: string[] = [];
  for (const text of lines) {
    const L = readLine(text);
    const [t0, t1, t2, t3] = L.toks;
    const tail = L.comment ? ` ${L.comment.text}` : '';
    const isName = (t: Token | undefined) => !!t && (t.type === 'ident' || t.type === 'string');
    // A definition: id: …
    if (isName(t0) && t1?.type === 'colon') {
      if (!named(t0)) out.push(text);
      continue;
    }
    // A mark: circle id, note id "…", circle a -> b
    if (t0?.type === 'ident' && (MARKS as string[]).includes(t0.value) && isName(t1) && t2?.type !== 'colon') {
      const onArrow = t2?.type === 'arrow' && isName(t3);
      if (t2?.type !== 'arrow' || onArrow) {
        if (!named(t1) && !(onArrow && named(t3))) out.push(text);
        continue;
      }
    }
    if (t0?.type === 'ident' && t0.value === 'step' && t1?.type === 'number') {
      let k = 2;
      if (L.toks[k]?.type === 'colon') k++;
      const rest = L.toks.slice(k).filter((t) => t.type !== 'comma');
      const last = rest[rest.length - 1];
      // As in the parser: a quoted string at the end is the caption.
      const caption = last?.type === 'string' ? last : undefined;
      const items = rest.filter((t) => t !== caption);
      if (!items.some(named)) out.push(text);
      else {
        const kept = items.filter((t) => !named(t)).map((t) => t.text);
        if (kept.length || caption) out.push(`${L.indent}step ${t1.text}: ${[kept.join(', '), caption?.text].filter(Boolean).join(' ')}${tail}`);
      }
      continue;
    }
    if (t0?.type === 'ident' && t0.value === 'group' && L.toks[L.toks.length - 1]?.type === 'rbrace') {
      const open = L.toks.findIndex((t) => t.type === 'lbrace');
      const members = open < 0 ? [] : L.toks.slice(open + 1, -1).filter((t) => t.type !== 'comma');
      if (!members.some(named)) out.push(text);
      else {
        const kept = members.filter((t) => !named(t)).map((t) => t.text);
        if (kept.length) out.push(`${L.text.slice(0, L.toks[open].to)} ${kept.join(', ')} }${tail}`);
      }
      continue;
    }
    const colon = L.toks.findIndex((t) => t.type === 'colon');
    const head = colon < 0 ? L.toks : L.toks.slice(0, colon);
    if (head.some((t) => t.type === 'arrow') && head.some(named)) out.push(...splitChain(text, ids));
    else out.push(text);
  }
  return out.join('\n');
}

/** Rewrites an arrow line without the arrows that touch any of `ids`. */
function splitChain(text: string, ids: Set<string>): string[] {
  const isNameOf = (t: Token) => (t.type === 'ident' || t.type === 'string') && ids.has(t.value);
  const L = readLine(text);
  const colon = L.toks.findIndex((t) => t.type === 'colon');
  const head = colon < 0 ? L.toks : L.toks.slice(0, colon);
  let chainEnd = 0;
  while (chainEnd + 2 < head.length && head[chainEnd + 1].type === 'arrow') chainEnd += 2;
  const names = head.filter((_, k) => k <= chainEnd && k % 2 === 0);
  const ops = head.filter((_, k) => k <= chainEnd && k % 2 === 1);
  const keep = ops.map((_, k) => !isNameOf(names[k]) && !isNameOf(names[k + 1]));
  if (keep.every(Boolean)) return [text];
  // Options before the colon apply to every arrow on the line; the label only to the last.
  const headOptions = text.slice(head[chainEnd].to, colon < 0 ? (L.comment?.from ?? text.length) : L.toks[colon].from).trim();
  const rest = text.slice(head[chainEnd].to, L.comment?.from ?? text.length).trim();
  const chains: { from: number; to: number }[] = [];
  keep.forEach((k, i) => {
    if (!k) return;
    const c = chains[chains.length - 1];
    if (c && c.to === i) c.to = i + 1;
    else chains.push({ from: i, to: i + 1 });
  });
  return chains.map((c) => {
    let s = names[c.from].text;
    for (let k = c.from; k < c.to; k++) s += ` ${ops[k].text} ${names[k + 1].text}`;
    const extra = c.to === ops.length ? rest : headOptions;
    return L.indent + s + (extra ? ` ${extra}` : '');
  });
}

/* ── Fixes and settings ──────────────────────────────────────────────────── */

export function applyFix(source: string, fix: { span: { from: number; to: number }; text: string }): string {
  return source.slice(0, fix.span.from) + fix.text + source.slice(fix.span.to);
}

/** Sets paper, pen, hand and mess from a look preset. */
export function applyPreset(source: string, presetId: string): string {
  const p = PRESETS.find((x) => x.id === presetId);
  if (!p) return source;
  let s = source;
  s = setDirective(s, 'paper', p.paper);
  s = setDirective(s, 'pen', p.pen);
  s = setDirective(s, 'hand', p.hand);
  s = setDirective(s, 'mess', p.mess);
  return s;
}

/** Which preset the source matches exactly, if any. */
export function currentPreset(doc: { paper: string; pen: string; hand: string; mess: number }): string | null {
  return PRESETS.find((p) => p.paper === doc.paper && p.pen === doc.pen && p.hand === doc.hand && Math.abs(p.mess - doc.mess) < 1e-6)?.id ?? null;
}
