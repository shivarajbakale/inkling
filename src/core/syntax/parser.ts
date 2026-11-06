import { ICON_NAMES } from '../icons';
import { COLORS, DEFAULTS, HANDS, INKS, LAYOUT_NAMES, PAPERS, PENS, SIZES } from '../styles';
import type { AnnotationKind, Diagnostic, Doc, EdgeKind, GroupDef, NodeDef, Shape, Size, Span } from '../types';
import { closest, didYouMean } from './suggest';
import { tokenize, type Token } from './tokens';

export const SHAPES: Shape[] = ['box', 'round', 'circle', 'diamond', 'cloud', 'db', 'sticky', 'person', 'icon', 'text'];
export const SHAPE_ALIASES: Record<string, Shape> = {
  rect: 'box',
  rectangle: 'box',
  square: 'box',
  pill: 'round',
  oval: 'circle',
  ellipse: 'circle',
  decision: 'diamond',
  database: 'db',
  cylinder: 'db',
  note: 'sticky',
  stick: 'person',
  user: 'person',
  label: 'text',
};
export const MARKS: AnnotationKind[] = ['circle', 'underline', 'strike', 'highlight', 'note', 'cross', 'check'];
export const SETTINGS = ['title', 'layout', 'direction', 'paper', 'pen', 'hand', 'mess', 'seed', 'steps', 'inkling', 'root', 'center', 'footer', 'colors', 'gap'] as const;
export const KEYWORDS = [...SETTINGS, 'step', 'group', 'cycle', 'columns', 'row', 'span', 'brace', 'activate', 'deactivate', ...MARKS];
/** Options written as key=value, and which statements take them. */
export const NODE_OPTIONS = ['color', 'fill', 'pen', 'size', 'icon', 'gap'];
export const EDGE_OPTIONS = ['color', 'pen'];

const isId = (t: Token | undefined) => !!t && (t.type === 'ident' || t.type === 'string');
/** Names that marks and steps may point at: also numbers (timeline dates). */
const isRef = (t: Token | undefined) => isId(t) || t?.type === 'number';
/** A slug for ids made from text: lower case, words joined by hyphens. */
export const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/\n/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'item';
const humanize = (id: string) => id.replace(/[-_]+/g, ' ');
const shapeNames = [...SHAPES, ...Object.keys(SHAPE_ALIASES)];

/** Parses Inkling source. Never throws: problems become diagnostics and the line is skipped. */
export function parse(source: string): Doc {
  const doc: Doc = {
    ...DEFAULTS,
    nodes: [],
    edges: [],
    annotations: [],
    steps: [],
    groups: [],
    autoSteps: false,
    columns: [],
    rows: [],
    ranges: [],
    colors: false,
    activations: [],
    footer: true,
    diagnostics: [],
  };
  const nodeIndex = new Map<string, number>();
  const groupIndex = new Map<string, GroupDef>();
  const groupStack: { group: GroupDef; span: Span }[] = [];
  const lines = source.split('\n');
  let order = 0;

  const report = (severity: Diagnostic['severity'], code: string, message: string, span: Span, hint?: string, fix?: string) =>
    doc.diagnostics.push({ code, severity, message, span, hint, fix: fix !== undefined ? { span, text: fix } : undefined });
  const tokSpan = (t: Token): Span => ({ line: t.line, from: t.from, to: t.to });
  const suggest = (t: Token, candidates: Iterable<string>) => {
    const c = closest(t.value, candidates);
    return c ? { hint: `Did you mean "${c}"?`, fix: c } : { hint: undefined, fix: undefined };
  };
  const currentGroup = () => groupStack[groupStack.length - 1]?.group;
  /** Outline bullets, turned into nodes once the layout is known. */
  const bullets: { text: string; as?: string; level: number; parent?: number; span: Span; line: number; order: number; group?: GroupDef }[] = [];
  /** Compare rows as written, turned into nodes at the end. */
  const rowDefs: { label: string; cells: { text?: string; mark?: 'yes' | 'no' | 'partly'; win: boolean }[]; span: Span; line: number; order: number }[] = [];
  const columnDefs: { label: string; span: Span }[] = [];

  /** Puts a node in a group. Implicit joins never move a node out of a group it already has. */
  const joinGroup = (id: string, group: GroupDef | undefined, explicit: boolean) => {
    if (!group) return;
    const node = doc.nodes[nodeIndex.get(id)!];
    if (node.group && node.group !== group.id && !explicit) return;
    if (node.group && node.group !== group.id) {
      const old = groupIndex.get(node.group);
      if (old) old.members = old.members.filter((m) => m !== id);
    }
    node.group = group.id;
    if (!group.members.includes(id)) group.members.push(id);
  };

  const ensureNode = (id: string, span: Span, line: number) => {
    if (nodeIndex.has(id)) return;
    nodeIndex.set(id, doc.nodes.length);
    doc.nodes.push({ id, shape: 'box', label: humanize(id), line, span, order, implicit: true });
    joinGroup(id, currentGroup(), false);
  };

  tokenize(source).forEach((all, i) => {
    const lineNo = i + 1;
    const text = lines[i];
    const comment = all.find((t) => t.type === 'comment');
    const toks = all.filter((t) => t.type !== 'comment');
    if (!toks.length) return;
    const span: Span = { line: lineNo, from: toks[0].from, to: toks[toks.length - 1].to };
    const err = (code: string, message: string, at: Span = span, hint?: string, fix?: string) => report('error', code, message, at, hint, fix);
    const warn = (code: string, message: string, at: Span = span, hint?: string) => report('warning', code, message, at, hint);

    const broken = toks.find((t) => t.error);
    if (broken) {
      err('E-UNCLOSED-STRING', broken.error!, tokSpan(broken), 'Add a " at the end of the text.');
      return;
    }

    const lineOffset = toks[0].from - text.search(/\S/);
    /** Raw text after token `t` up to the end of the line (before any comment). */
    const restAfter = (t: Token) => text.slice(t.to - lineOffset, comment ? comment.from - lineOffset : text.length).trim();
    const unquote = (s: string) => {
      const t = s.trim();
      const body = t.length >= 2 && t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
      return body.replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c));
    };

    /** Reads `key=value` options from the end of a token list, or reports a problem and returns null. */
    const takeOptions = (list: Token[], allowed: string[]): { opts: Record<string, Token>; rest: Token[] } | null => {
      const opts: Record<string, Token> = {};
      let end = list.length;
      while (end >= 3 && list[end - 2].type === 'equals') {
        const key = list[end - 3];
        const value = list[end - 1];
        if (key.type !== 'ident') break;
        if (!allowed.includes(key.value)) {
          const s = suggest(key, allowed);
          err('E-UNKNOWN-OPTION', `There is no "${key.value}" option here.`, tokSpan(key), s.hint ?? `Options: ${allowed.join(', ')}.`, s.fix);
          return null;
        }
        opts[key.value] = value;
        end -= 3;
      }
      return { opts, rest: list.slice(0, end) };
    };

    /** Checks an option's value against what it accepts. */
    const checkOption = (key: string, value: Token): boolean => {
      if (key === 'gap') return true;
      const lists: Record<string, string[]> = {
        color: Object.keys(INKS),
        fill: Object.keys(COLORS),
        pen: Object.keys(PENS),
        size: Object.keys(SIZES),
        icon: ICON_NAMES,
      };
      const list = lists[key];
      if (list && !list.includes(value.value)) {
        const s = suggest(value, list);
        err('E-BAD-OPTION', `"${value.value}" is not a ${key}.`, tokSpan(value), s.hint ?? `Try: ${list.join(', ')}.`, s.fix);
        return false;
      }
      return true;
    };

    // ── Closing a group ────────────────────────────────────────────────
    if (toks[0].type === 'rbrace') {
      if (!groupStack.length) err('E-UNEXPECTED', 'This } does not close a group.', span);
      else groupStack.pop();
      if (toks.length > 1) err('E-UNEXPECTED', 'Put anything after } on its own line.', { line: lineNo, from: toks[1].from, to: span.to });
      return;
    }

    const [t0, t1] = toks;
    const firstIsWord = t0.type === 'ident';
    const notDefinition = !t1 || (t1.type !== 'colon' && t1.type !== 'arrow');

    // ── Outline bullets: - text  (as id) ──────────────────────────────
    if (t0.type === 'bullet') {
      order++;
      const lead = text.slice(0, text.search(/\S/)).replace(/\t/g, '  ').length;
      const level = Math.floor(lead / 2);
      let body = text.slice(t0.to - lineOffset, comment ? comment.from - lineOffset : text.length).trim();
      let as: string | undefined;
      const asMatch = body.match(/\s+as\s+([A-Za-z_][\w-]*)$/);
      if (asMatch) {
        as = asMatch[1];
        body = body.slice(0, asMatch.index).trim();
      }
      body = body.replace(/^"(.*)"$/, '$1').replace(/\\n/g, '\n');
      if (!body) {
        err('E-EMPTY-BULLET', 'This bullet has no text.', span);
        return;
      }
      // The parent is the nearest bullet above with a smaller indent.
      let parent: number | undefined;
      for (let k = bullets.length - 1; k >= 0; k--) {
        if (bullets[k].level < level) {
          parent = k;
          break;
        }
      }
      if (level > 0 && parent === undefined) warn('W-BULLET-INDENT', 'This bullet is indented but has no bullet above it.', span);
      bullets.push({ text: body, as, level: parent === undefined ? 0 : level, parent, span, line: lineNo, order, group: currentGroup() });
      return;
    }

    // ── cycle a, b, c  (counterclockwise) ─────────────────────────────
    if (firstIsWord && t0.value === 'cycle' && notDefinition) {
      order++;
      const ids: string[] = [];
      let ccw = false;
      for (const t of toks.slice(1)) {
        if (t.type === 'comma') continue;
        if (t.type === 'ident' && t.value === 'counterclockwise') ccw = true;
        else if (isId(t)) ids.push(t.value);
        else {
          err('E-UNEXPECTED', `I don't understand "${t.text}" in a cycle. List names separated by commas.`, tokSpan(t));
          return;
        }
      }
      if (ids.length < 2) {
        err('E-BAD-CYCLE', 'A cycle needs at least two names, like  cycle a, b, c', span);
        return;
      }
      if (doc.cycle) warn('W-SECOND-CYCLE', 'Only one cycle is drawn; this one adds arrows only.', span);
      else doc.cycle = { ids, counterclockwise: ccw };
      ids.forEach((id) => ensureNode(id, span, lineNo));
      ids.forEach((from, k) => {
        const to = ids[(k + 1) % ids.length];
        doc.edges.push({ from, to, kind: 'solid', both: false, line: lineNo, span, order });
      });
      return;
    }

    // ── columns "A", "B" ───────────────────────────────────────────────
    if (firstIsWord && t0.value === 'columns' && notDefinition) {
      order++;
      for (const t of toks.slice(1)) {
        if (t.type === 'comma') continue;
        if (isId(t) || t.type === 'number') columnDefs.push({ label: t.value, span: tokSpan(t) });
        else {
          err('E-UNEXPECTED', `I don't understand "${t.text}" in columns. List names separated by commas.`, tokSpan(t));
          return;
        }
      }
      return;
    }

    // ── row "Label": "cell", yes, no, partly! ─────────────────────────
    if (firstIsWord && t0.value === 'row' && isRef(t1) && toks[2]?.type === 'colon') {
      order++;
      const cells: { text?: string; mark?: 'yes' | 'no' | 'partly'; win: boolean }[] = [];
      let cur: { text?: string; mark?: 'yes' | 'no' | 'partly'; win: boolean } | null = null;
      for (const t of toks.slice(3)) {
        if (t.type === 'comma') {
          if (cur) cells.push(cur);
          cur = null;
          continue;
        }
        if (t.type === 'word' && t.text === '!' && cur) {
          cur.win = true;
          continue;
        }
        if (cur) {
          err('E-UNEXPECTED', `Put a comma between cells, before "${t.text}".`, tokSpan(t));
          return;
        }
        if (t.type === 'ident' && ['yes', 'no', 'partly'].includes(t.value)) cur = { mark: t.value as 'yes' | 'no' | 'partly', win: false };
        else if (t.type === 'string' || t.type === 'number' || t.type === 'ident') cur = { text: t.value, win: false };
        else {
          err('E-UNEXPECTED', `I don't understand "${t.text}" in a row. Use quoted text, yes, no or partly.`, tokSpan(t));
          return;
        }
      }
      if (cur) cells.push(cur);
      rowDefs.push({ label: t1.value, cells, span, line: lineNo, order });
      return;
    }

    // ── span a..b "label"  /  brace a..b "label" ───────────────────────
    if (firstIsWord && (t0.value === 'span' || t0.value === 'brace') && notDefinition) {
      order++;
      const m = restAfter(t0).match(/^(.+?)\s*\.\.\s*(.+?)(?:\s+"((?:[^"\\]|\\.)*)")?$/);
      if (!m) {
        err('E-BAD-RANGE', `Write it as  ${t0.value} first..last "label"`, span);
        return;
      }
      const strip = (x: string) => x.trim().replace(/^"(.*)"$/, '$1');
      doc.ranges.push({ kind: t0.value as 'span' | 'brace', from: strip(m[1]), to: strip(m[2]), label: m[3]?.replace(/\\n/g, '\n'), line: lineNo, span });
      return;
    }

    // ── activate x / deactivate x (sequence) ──────────────────────────
    if (firstIsWord && (t0.value === 'activate' || t0.value === 'deactivate') && isId(t1) && notDefinition) {
      order++;
      doc.activations.push({ id: t1.value, on: t0.value === 'activate', order, span });
      return;
    }

    // ── Groups: group backend "Backend" {   or   group g "G" { a, b } ──
    if (firstIsWord && t0.value === 'group' && notDefinition) {
      order++;
      if (!isId(t1)) {
        err('E-BAD-GROUP', 'Write a group as  group name "Label" {', span);
        return;
      }
      let k = 2;
      const labelTok = toks[k]?.type === 'string' ? toks[k++] : undefined;
      if (toks[k]?.type !== 'lbrace') {
        err('E-BAD-GROUP', 'A group needs a { after its name, then its members, then a } line.', span);
        return;
      }
      k++;
      if (groupIndex.has(t1.value)) {
        err('E-DUPLICATE-GROUP', `There is already a group called "${t1.value}".`, tokSpan(t1));
        return;
      }
      const parent = currentGroup();
      if (parent?.parent) {
        err('E-GROUP-TOO-DEEP', 'Groups can sit inside one other group, not deeper.', span);
        return;
      }
      const group: GroupDef = { id: t1.value, label: labelTok ? labelTok.value : humanize(t1.value), members: [], parent: parent?.id, line: lineNo, span, order };
      groupIndex.set(group.id, group);
      doc.groups.push(group);
      const inner = toks.slice(k);
      if (inner.length && inner[inner.length - 1].type === 'rbrace') {
        // One-line form: group g "G" { a, b }
        for (const t of inner.slice(0, -1)) {
          if (t.type === 'comma') continue;
          if (!isId(t)) {
            err('E-UNEXPECTED', `I don't understand "${t.text}" in a group. List names separated by commas.`, tokSpan(t));
            return;
          }
          ensureNode(t.value, span, lineNo);
          joinGroup(t.value, group, true);
        }
      } else if (inner.length) {
        err('E-UNEXPECTED', 'After { either list members and close with } on the same line, or start the next line.', tokSpan(inner[0]));
      } else {
        groupStack.push({ group, span });
      }
      return;
    }

    // ── Settings ────────────────────────────────────────────────────────
    if (firstIsWord && (SETTINGS as readonly string[]).includes(t0.value) && notDefinition) {
      order++;
      const key = t0.value;
      if (!t1) {
        err('E-MISSING-VALUE', `"${key}" needs a value.`, span);
        return;
      }
      if (key === 'title') {
        doc.title = unquote(restAfter(t0));
        return;
      }
      const extra = toks[2];
      if (extra) err('E-UNEXPECTED', `"${key}" takes one value. I don't understand "${extra.text}" here.`, { line: lineNo, from: extra.from, to: span.to });
      const v = t1.value;
      if (key === 'center') {
        doc.center = unquote(restAfter(t0));
        return;
      }
      if (key === 'root') {
        doc.root = v;
        return;
      }
      if (key === 'footer' || key === 'colors') {
        if (v !== 'on' && v !== 'off') {
          err('E-BAD-SWITCH', `Write  ${key} on  or  ${key} off.`, tokSpan(t1));
          return;
        }
        if (key === 'footer') doc.footer = v === 'on';
        else doc.colors = v === 'on';
        return;
      }
      if (key === 'gap') {
        const n = Number(v);
        if (t1.type === 'number' && n >= 0 && n <= 200) doc.gap = n;
        else err('E-BAD-GAP', 'Gap is a number of pixels from 0 to 200.', tokSpan(t1));
        return;
      }
      if (key === 'layout' && LAYOUT_NAMES.includes(v)) {
        doc.layout = v;
        return;
      }
      if (key === 'steps') {
        if (v === 'auto') doc.autoSteps = true;
        else err('E-BAD-STEPS', 'Write  steps auto  to make each node its own step.', tokSpan(t1));
        return;
      }
      if (key === 'inkling') {
        doc.version = Number(v);
        if (v !== '1') warn('W-VERSION', `This file says Inkling ${v}; this renderer reads version 1.`, tokSpan(t1));
        return;
      }
      const options: Record<string, string[]> = {
        layout: ['right', 'down', ...LAYOUT_NAMES],
        direction: ['right', 'down'],
        paper: Object.keys(PAPERS),
        pen: Object.keys(PENS),
        hand: Object.keys(HANDS),
      };
      if (options[key]) {
        if (!options[key].includes(v)) {
          const s = suggest(t1, options[key]);
          const what =
            key === 'layout'
              ? `No layout called "${v}". Layouts: ${LAYOUT_NAMES.join(', ')}; or right / down for the direction.`
              : key === 'direction'
                ? `Direction can be "right" or "down", not "${v}".`
                : `No ${key === 'hand' ? 'handwriting' : key} called "${v}".`;
          err(`E-UNKNOWN-${key === 'direction' ? 'LAYOUT' : key.toUpperCase()}`, what, tokSpan(t1), s.hint ?? `Try: ${options[key].join(', ')}.`, s.fix);
          return;
        }
        if (key === 'layout' || key === 'direction') {
          doc.direction = v as Doc['direction'];
          doc.directionSet = true;
        }
        else (doc as unknown as Record<string, string>)[key] = v;
        return;
      }
      const n = Number(v);
      if (key === 'mess') {
        if (t1.type === 'number' && n >= 0 && n <= 1) doc.mess = n;
        else err('E-BAD-MESS', 'Mess is a number from 0 (tidy) to 1 (chaotic).', tokSpan(t1));
        return;
      }
      if (key === 'seed') {
        if (t1.type === 'number' && Number.isInteger(n)) doc.seed = n;
        else err('E-BAD-SEED', 'Seed is a whole number, such as 7.', tokSpan(t1));
        return;
      }
    }

    // ── Steps: step 2: a, b "caption" ──────────────────────────────────
    if (firstIsWord && t0.value === 'step' && t1?.type === 'number') {
      order++;
      let k = 2;
      if (toks[k]?.type === 'colon') k++;
      const items: string[] = [];
      let caption: string | undefined;
      for (; k < toks.length; k++) {
        const t = toks[k];
        if (t.type === 'comma') continue;
        if (t.type === 'string' && k === toks.length - 1) caption = t.value;
        else if (t.type === 'ident' || t.type === 'string' || t.type === 'number') items.push(t.value);
        else {
          err('E-UNEXPECTED', `I don't understand "${t.text}" in a step. List names separated by commas, then an optional "caption".`, tokSpan(t));
          return;
        }
      }
      doc.steps.push({ index: Number(t1.value), items, caption, line: lineNo, span });
      return;
    }

    // ── Marks: circle x, note x "text", highlight x pink @3, circle a -> b ──
    // A cell id is written row.column: join `schema` `.sql` back together.
    let markToks = toks;
    if (toks[2]?.type === 'word' && toks[2].text.startsWith('.') && toks[2].from === toks[1].to) {
      const joined = { ...toks[1], type: 'ident' as const, text: toks[1].text + toks[2].text, value: toks[1].value + toks[2].text, to: toks[2].to };
      markToks = [toks[0], joined, ...toks.slice(3)];
    }
    const onArrow = markToks[2]?.type === 'arrow' && isRef(markToks[3]);
    if (firstIsWord && (MARKS as string[]).includes(t0.value) && isRef(markToks[1]) && notDefinition && (markToks[2]?.type !== 'arrow' || onArrow)) {
      order++;
      const kind = t0.value as AnnotationKind;
      const t1m = markToks[1];
      const target = onArrow ? `${t1m.value}->${markToks[3].value}` : t1m.value;
      let text: string | undefined;
      let at: number | undefined;
      let color: string | undefined;
      for (const t of markToks.slice(onArrow ? 4 : 2)) {
        if (t.type === 'string' && text === undefined) text = t.value;
        else if (t.type === 'at') at = Number(t.value);
        else if (t.type === 'ident' && COLORS[t.value]) color = t.value;
        else {
          const s = t.type === 'ident' ? suggest(t, Object.keys(COLORS)) : { hint: undefined, fix: undefined };
          err('E-UNEXPECTED', `I don't understand "${t.text}" here.`, tokSpan(t), s.hint, s.fix);
          return;
        }
      }
      if (kind === 'note' && !text) {
        err('E-NOTE-NEEDS-TEXT', `A note needs text, like  note ${target} "remember this"`, span);
        return;
      }
      doc.annotations.push({ kind, target, targetKind: onArrow ? 'edge' : 'node', text, color, at, line: lineNo, span, order });
      return;
    }

    // ── Arrows and chains: a -> b ~> c : label color=red ───────────────
    const colonAt = toks.findIndex((t) => t.type === 'colon');
    const headAll = colonAt === -1 ? toks : toks.slice(0, colonAt);
    if (headAll.some((t) => t.type === 'arrow')) {
      order++;
      const headOpts = takeOptions(headAll, EDGE_OPTIONS);
      if (!headOpts) return;
      const head = headOpts.rest;
      let opts = headOpts.opts;
      const ok = head.length >= 3 && head.length % 2 === 1 && head.every((t, k) => (k % 2 === 0 ? isId(t) : t.type === 'arrow'));
      if (!ok) {
        const bad = head.find((t, k) => (k % 2 === 0 ? !isId(t) : t.type !== 'arrow'));
        if (bad && bad.type === 'word') err('E-BAD-NAME', `"${bad.text}" is not a valid name. Use letters, digits, - or _, or put it in quotes.`, tokSpan(bad));
        else err('E-ARROW-NEEDS-ENDS', 'An arrow needs a name on both sides, like "a -> b".', span);
        return;
      }
      let label: string | undefined;
      if (colonAt !== -1) {
        const after = toks.slice(colonAt + 1);
        if (after[0]?.type === 'string') {
          // A quoted label can be followed by options.
          label = after[0].value;
          const tail = takeOptions(after.slice(1), EDGE_OPTIONS);
          if (!tail) return;
          if (tail.rest.length) {
            err('E-UNEXPECTED', `I don't understand "${tail.rest[0].text}" after the label.`, tokSpan(tail.rest[0]));
            return;
          }
          opts = { ...opts, ...tail.opts };
        } else {
          // An unquoted label is everything before any trailing key=value options.
          let end = after.length;
          while (end >= 3 && after[end - 2].type === 'equals' && after[end - 3].type === 'ident' && EDGE_OPTIONS.includes(after[end - 3].value)) end -= 3;
          const tail = takeOptions(after.slice(end), EDGE_OPTIONS);
          if (!tail) return;
          opts = { ...opts, ...tail.opts };
          const startCol = toks[colonAt].to - lineOffset;
          const endCol = end < after.length ? after[end].from - lineOffset : comment ? comment.from - lineOffset : text.length;
          label = unquote(text.slice(startCol, endCol)) || undefined;
        }
      }
      for (const [k, v] of Object.entries(opts)) if (!checkOption(k, v)) return;
      for (let k = 0; k + 2 < head.length; k += 2) {
        const from = head[k].value;
        const op = head[k + 1].value;
        const to = head[k + 2].value;
        ensureNode(from, span, lineNo);
        ensureNode(to, span, lineNo);
        const kind: EdgeKind = op.includes('~') ? 'squiggle' : op === '-->' ? 'dashed' : 'solid';
        doc.edges.push({
          from,
          to,
          kind,
          both: op.startsWith('<'),
          label: k + 2 === head.length - 1 && label ? label : undefined,
          color: opts.color?.value,
          pen: opts.pen?.value,
          line: lineNo,
          span,
          order,
        });
      }
      return;
    }

    // ── Node definitions: id : shape "Label" fill  key=value… ──────────
    if (isId(t0) && t1?.type === 'colon') {
      order++;
      const id = t0.value;
      const parsed = takeOptions(toks.slice(2), NODE_OPTIONS);
      if (!parsed) return;
      const { opts } = parsed;
      let body = parsed.rest;
      // Placement for the free layout: `at 200,120`, `below api`, `right of api`.
      let at: [number, number] | undefined;
      let near: NodeDef['near'];
      const placeAt = body.findIndex((t) => t.type === 'ident' && ['at', 'below', 'above', 'left', 'right'].includes(t.value) && (t.value !== 'at' || body[body.indexOf(t) + 1]?.type === 'number'));
      if (placeAt !== -1) {
        const p = body.slice(placeAt);
        const word = p[0].value;
        if (word === 'at') {
          if (p.length === 4 && p[1].type === 'number' && p[2].type === 'comma' && p[3].type === 'number') at = [Number(p[1].value), Number(p[3].value)];
          else {
            err('E-BAD-PLACE', 'Write a position as  at 200,120', { line: lineNo, from: p[0].from, to: span.to });
            return;
          }
        } else {
          const hasOf = p[1]?.type === 'ident' && p[1].value === 'of';
          const target = hasOf ? p[2] : p[1];
          const needsOf = word === 'left' || word === 'right';
          if (!isId(target) || p.length !== (hasOf ? 3 : 2) || (needsOf && !hasOf)) {
            err('E-BAD-PLACE', `Write it as  ${needsOf ? `${word} of other` : `${word} other`}`, { line: lineNo, from: p[0].from, to: span.to });
            return;
          }
          near = { side: word as 'below' | 'above' | 'left' | 'right', of: target.value, gap: opts.gap ? Number(opts.gap.value) : undefined };
        }
        body = body.slice(0, placeAt);
      }
      if (opts.gap && opts.gap.type !== 'number') {
        err('E-BAD-OPTION', 'gap is a number of pixels.', tokSpan(opts.gap));
        return;
      }
      let k = 0;
      let shapeTok: Token | undefined;
      let iconTok: Token | undefined;
      let labelTok: Token | undefined;
      let fillTok: Token | undefined;
      if (body[k]?.type === 'ident') shapeTok = body[k++];
      if (shapeTok?.value === 'icon' && body[k]?.type === 'ident') iconTok = body[k++];
      if (body[k]?.type === 'string') labelTok = body[k++];
      if (body[k]?.type === 'ident') fillTok = body[k++];
      if (k < body.length) {
        err('E-BAD-NODE', `Write a node as  ${id}: box "Label"`, span, `I don't understand "${body[k].text}" here.`);
        return;
      }
      // `id: "Label" yellow` or `id: yellow` has no shape word
      if (shapeTok && !shapeNames.includes(shapeTok.value)) {
        if (!labelTok && !fillTok && COLORS[shapeTok.value]) {
          fillTok = shapeTok;
          shapeTok = undefined;
        } else {
          const s = suggest(shapeTok, shapeNames);
          err('E-UNKNOWN-SHAPE', `No shape called "${shapeTok.value}".`, tokSpan(shapeTok), s.hint ?? `Try: ${SHAPES.join(', ')}.`, s.fix);
          return;
        }
      }
      if (fillTok && !COLORS[fillTok.value]) {
        const s = suggest(fillTok, Object.keys(COLORS));
        err('E-UNKNOWN-COLOR', `No colour called "${fillTok.value}".`, tokSpan(fillTok), s.hint ?? `Try: ${Object.keys(COLORS).join(', ')}.`, s.fix);
        return;
      }
      if (shapeTok?.value === 'icon' && iconTok && !ICON_NAMES.includes(iconTok.value)) {
        const s = suggest(iconTok, ICON_NAMES);
        err('E-UNKNOWN-ICON', `No icon called "${iconTok.value}".`, tokSpan(iconTok), s.hint ?? `Icons: ${ICON_NAMES.join(', ')}.`, s.fix);
        return;
      }
      for (const [key, v] of Object.entries(opts)) if (!checkOption(key, v)) return;
      let shape: Shape = shapeTok ? (SHAPE_ALIASES[shapeTok.value] ?? (shapeTok.value as Shape)) : 'box';
      if (opts.icon && !shapeTok) shape = 'icon';
      const icon = shape === 'icon' ? (iconTok?.value ?? opts.icon?.value) : undefined;
      if (shape === 'icon' && !icon) {
        err('E-ICON-NEEDS-NAME', `Name the icon, like  ${id}: icon server "Label"`, span, `Icons: ${ICON_NAMES.join(', ')}.`);
        return;
      }
      const def: NodeDef = {
        id,
        shape,
        label: labelTok ? labelTok.value : humanize(id),
        fill: fillTok?.value ?? opts.fill?.value,
        color: opts.color?.value,
        pen: opts.pen?.value,
        size: opts.size?.value as Size | undefined,
        icon,
        at,
        near,
        line: lineNo,
        span,
        order,
      };
      const existing = nodeIndex.get(id);
      if (existing !== undefined) {
        const prev = doc.nodes[existing];
        if (!prev.implicit) err('E-DUPLICATE-NODE', `"${id}" is already defined on line ${prev.line}.`, tokSpan(t0), 'Rename one of them, or delete this line.');
        def.group = prev.group;
        doc.nodes[existing] = def;
      } else {
        nodeIndex.set(id, doc.nodes.length);
        doc.nodes.push(def);
      }
      joinGroup(id, currentGroup(), true);
      return;
    }

    // ── Nothing matched ────────────────────────────────────────────────
    const hint = firstIsWord ? didYouMean(t0.value, KEYWORDS) : undefined;
    err('E-UNKNOWN-LINE', "I don't understand this line.", span, hint);
  });

  // Bullets become nodes now that the layout is known.
  const bulletIds: string[] = [];
  const taken = new Set([...nodeIndex.keys()]);
  const uniqueId = (base: string) => {
    let id = base;
    for (let n = 2; taken.has(id) && !doc.nodes[nodeIndex.get(id)!]?.implicit; n++) id = `${base}-${n}`;
    taken.add(id);
    return id;
  };
  for (const b of bullets) {
    let label = b.text;
    let date: string | undefined;
    if (doc.layout === 'timeline') {
      const m = b.text.match(/^([^:]+):\s*([\s\S]+)$/);
      if (m) {
        date = m[1].trim();
        label = m[2].trim();
      }
    }
    const id = b.as ?? uniqueId(slug(date ?? label));
    bulletIds.push(id);
    const parent = b.parent !== undefined ? bulletIds[b.parent] : undefined;
    const existing = nodeIndex.get(id);
    if (existing !== undefined) {
      const n = doc.nodes[existing];
      if (n.implicit) n.label = label;
      n.bullet = { level: b.level, parent };
      n.date = date;
      n.implicit = false;
    } else {
      nodeIndex.set(id, doc.nodes.length);
      doc.nodes.push({ id, shape: 'box', label, date, bullet: { level: b.level, parent }, line: b.line, span: b.span, order: b.order });
      joinGroup(id, b.group, true);
    }
    // In flow and free layouts an outline is a tree of arrows.
    if (parent && (doc.layout === 'flow' || doc.layout === 'free'))
      doc.edges.push({ from: parent, to: id, kind: 'solid', both: false, line: b.line, span: b.span, order: b.order });
  }

  // Compare: headings, row labels and cells become nodes with ids marks can use.
  if (columnDefs.length || rowDefs.length) {
    const colIds = columnDefs.map((c) => uniqueId(slug(c.label)));
    columnDefs.forEach((c, k) => {
      nodeIndex.set(colIds[k], doc.nodes.length);
      doc.nodes.push({ id: colIds[k], shape: 'text', label: c.label, role: 'column', line: c.span.line, span: c.span, order: 0 });
    });
    doc.columns = colIds;
    for (const r of rowDefs) {
      const rid = uniqueId(slug(r.label));
      doc.rows.push(rid);
      nodeIndex.set(rid, doc.nodes.length);
      doc.nodes.push({ id: rid, shape: 'text', label: r.label, role: 'row', line: r.line, span: r.span, order: r.order });
      if (r.cells.length !== colIds.length)
        report('error', 'E-ROW-CELLS', `Row "${r.label}" has ${r.cells.length} cell${r.cells.length === 1 ? '' : 's'} but there ${colIds.length === 1 ? 'is 1 column' : `are ${colIds.length} columns`}.`, r.span);
      r.cells.slice(0, colIds.length).forEach((c, k) => {
        const id = `${rid}.${colIds[k]}`;
        nodeIndex.set(id, doc.nodes.length);
        doc.nodes.push({
          id,
          shape: 'text',
          label: c.text ?? '',
          cell: { mark: c.mark, win: c.win, row: rid, column: colIds[k] },
          line: r.line,
          span: r.span,
          order: r.order,
        });
      });
    }
    if (doc.layout !== 'compare') report('warning', 'W-NOT-USED', 'columns and row lines only draw with  layout compare.', rowDefs[0]?.span ?? columnDefs[0].span);
  }

  for (const { group, span } of groupStack)
    report('error', 'E-UNCLOSED-GROUP', `Group "${group.id}" is never closed.`, span, 'Add a line with just } after its last member.');

  // Groups: names must not clash with nodes, and empty ones are dropped.
  const dropped = new Set<string>();
  doc.groups = doc.groups.filter((g) => {
    if (nodeIndex.has(g.id)) {
      report('error', 'E-GROUP-NAME-TAKEN', `"${g.id}" is both a node and a group. Give the group another name.`, g.span);
      dropped.add(g.id);
      return false;
    }
    const hasChildGroup = doc.groups.some((c) => c.parent === g.id);
    if (!g.members.length && !hasChildGroup) {
      report('warning', 'W-EMPTY-GROUP', `Group "${g.id}" has nothing in it.`, g.span);
      dropped.add(g.id);
      return false;
    }
    return true;
  });
  if (dropped.size) {
    const parentOf = new Map(doc.groups.map((g) => [g.id, g.parent]));
    for (const n of doc.nodes) if (n.group && dropped.has(n.group)) n.group = undefined;
    for (const g of doc.groups) if (g.parent && dropped.has(g.parent)) g.parent = parentOf.get(g.parent);
  }

  // References, now that every node, group and arrow is known.
  const groupIds = new Set(doc.groups.map((g) => g.id));
  const ids = () => [...nodeIndex.keys(), ...groupIds];
  doc.annotations = doc.annotations.filter((a) => {
    if (a.targetKind === 'edge') {
      const [from, to] = a.target.split('->');
      let idx = doc.edges.findIndex((e) => e.from === from && e.to === to);
      if (idx === -1) idx = doc.edges.findIndex((e) => e.from === to && e.to === from);
      if (idx === -1) {
        report('error', 'E-UNKNOWN-TARGET', `There is no arrow between "${from}" and "${to}".`, a.span);
        return false;
      }
      a.edgeIndex = idx;
      if ((a.kind === 'underline' || a.kind === 'strike') && !doc.edges[idx].label) {
        report('warning', 'W-NO-LABEL', `That arrow has no label to ${a.kind}.`, a.span);
        return false;
      }
      return true;
    }
    if (groupIds.has(a.target) && !nodeIndex.has(a.target)) {
      a.targetKind = 'group';
      return true;
    }
    if (nodeIndex.has(a.target)) return true;
    const c = closest(a.target, ids());
    report('error', 'E-UNKNOWN-TARGET', `There is no node called "${a.target}".`, a.span, c ? `Did you mean "${c}"?` : undefined);
    return false;
  });
  for (const s of doc.steps) {
    for (const id of s.items.filter((x) => !nodeIndex.has(x) && !groupIds.has(x))) {
      const c = closest(id, ids());
      report('warning', 'W-STEP-UNKNOWN', `Step ${s.index} names "${id}", which is not a node.`, s.span, c ? `Did you mean "${c}"?` : undefined);
    }
    s.items = s.items.filter((id) => nodeIndex.has(id) || groupIds.has(id));
  }
  for (const r of doc.ranges)
    for (const id of [r.from, r.to])
      if (!nodeIndex.has(id)) {
        const c = closest(id, ids());
        report('error', 'E-UNKNOWN-TARGET', `There is no node called "${id}".`, r.span, c ? `Did you mean "${c}"?` : undefined);
      }
  doc.ranges = doc.ranges.filter((r) => nodeIndex.has(r.from) && nodeIndex.has(r.to));
  if (doc.root && !nodeIndex.has(doc.root)) {
    report('error', 'E-UNKNOWN-TARGET', `There is no node called "${doc.root}" to use as the root.`, { line: 1, from: 0, to: 0 });
    doc.root = undefined;
  }
  doc.activations = doc.activations.filter((a) => {
    if (nodeIndex.has(a.id)) return true;
    report('error', 'E-UNKNOWN-TARGET', `There is no participant called "${a.id}".`, a.span);
    return false;
  });
  if (doc.autoSteps && doc.steps.length)
    report('warning', 'W-STEPS-IGNORED', '"steps auto" is ignored because this file also has step lines.', doc.steps[0].span);
  doc.steps.sort((a, b) => a.index - b.index);
  doc.diagnostics.sort((a, b) => a.span.from - b.span.from);
  return doc;
}
