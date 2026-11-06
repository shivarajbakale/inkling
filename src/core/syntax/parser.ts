import { ICON_NAMES } from '../icons';
import { COLORS, DEFAULTS, HANDS, INKS, PAPERS, PENS, SIZES } from '../styles';
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
export const SETTINGS = ['title', 'layout', 'direction', 'paper', 'pen', 'hand', 'mess', 'seed', 'steps', 'inkling'] as const;
export const KEYWORDS = [...SETTINGS, 'step', 'group', ...MARKS];
/** Options written as key=value, and which statements take them. */
export const NODE_OPTIONS = ['color', 'fill', 'pen', 'size', 'icon'];
export const EDGE_OPTIONS = ['color', 'pen'];

const isId = (t: Token | undefined) => !!t && (t.type === 'ident' || t.type === 'string');
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
        layout: ['right', 'down'],
        direction: ['right', 'down'],
        paper: Object.keys(PAPERS),
        pen: Object.keys(PENS),
        hand: Object.keys(HANDS),
      };
      if (options[key]) {
        if (!options[key].includes(v)) {
          const s = suggest(t1, options[key]);
          const what =
            key === 'layout' || key === 'direction' ? `Layout can be "right" or "down", not "${v}".` : `No ${key === 'hand' ? 'handwriting' : key} called "${v}".`;
          err(`E-UNKNOWN-${key === 'direction' ? 'LAYOUT' : key.toUpperCase()}`, what, tokSpan(t1), s.hint ?? `Try: ${options[key].join(', ')}.`, s.fix);
          return;
        }
        if (key === 'layout' || key === 'direction') doc.direction = v as Doc['direction'];
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
        else if (t.type === 'ident' || t.type === 'string') items.push(t.value);
        else {
          err('E-UNEXPECTED', `I don't understand "${t.text}" in a step. List names separated by commas, then an optional "caption".`, tokSpan(t));
          return;
        }
      }
      doc.steps.push({ index: Number(t1.value), items, caption, line: lineNo, span });
      return;
    }

    // ── Marks: circle x, note x "text", highlight x pink @3, circle a -> b ──
    const onArrow = toks[2]?.type === 'arrow' && isId(toks[3]);
    if (firstIsWord && (MARKS as string[]).includes(t0.value) && isId(t1) && notDefinition && (toks[2]?.type !== 'arrow' || onArrow)) {
      order++;
      const kind = t0.value as AnnotationKind;
      const target = onArrow ? `${t1.value}->${toks[3].value}` : t1.value;
      let text: string | undefined;
      let at: number | undefined;
      let color: string | undefined;
      for (const t of toks.slice(onArrow ? 4 : 2)) {
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
      const body = parsed.rest;
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
  if (doc.autoSteps && doc.steps.length)
    report('warning', 'W-STEPS-IGNORED', '"steps auto" is ignored because this file also has step lines.', doc.steps[0].span);
  doc.steps.sort((a, b) => a.index - b.index);
  doc.diagnostics.sort((a, b) => a.span.from - b.span.from);
  return doc;
}
