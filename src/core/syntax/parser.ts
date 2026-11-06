import { COLORS, DEFAULTS, HANDS, PAPERS, PENS } from '../styles';
import type { AnnotationKind, Diagnostic, Doc, EdgeKind, Shape, Span } from '../types';
import { didYouMean, closest } from './suggest';
import { tokenize, type Token } from './tokens';

export const SHAPES: Shape[] = ['box', 'round', 'circle', 'diamond', 'cloud', 'db', 'sticky', 'person', 'text'];
export const SHAPE_ALIASES: Record<string, Shape> = {
  rect: 'box',
  rectangle: 'box',
  square: 'box',
  ellipse: 'circle',
  pill: 'round',
  oval: 'circle',
  decision: 'diamond',
  database: 'db',
  cylinder: 'db',
  note: 'sticky',
  stick: 'person',
  user: 'person',
  label: 'text',
};
export const MARKS: AnnotationKind[] = ['circle', 'underline', 'strike', 'highlight', 'note', 'cross', 'check'];
export const SETTINGS = ['title', 'layout', 'direction', 'paper', 'pen', 'hand', 'mess', 'seed'] as const;
export const KEYWORDS = [...SETTINGS, 'step', ...MARKS];

const isId = (t: Token | undefined) => !!t && (t.type === 'ident' || t.type === 'string');
const humanize = (id: string) => id.replace(/[-_]+/g, ' ');
const shapeNames = [...SHAPES, ...Object.keys(SHAPE_ALIASES)];

/** Parses Inkling source. Never throws: problems become diagnostics and the line is skipped. */
export function parse(source: string): Doc {
  const doc: Doc = { ...DEFAULTS, nodes: [], edges: [], annotations: [], steps: [], diagnostics: [] };
  const nodeIndex = new Map<string, number>();
  const lines = source.split('\n');
  const tokenLines = tokenize(source);
  let order = 0;

  const report = (
    severity: Diagnostic['severity'],
    code: string,
    message: string,
    span: Span,
    hint?: string,
    fixText?: string,
  ) => doc.diagnostics.push({ code, severity, message, span, hint, fix: fixText !== undefined ? { span, text: fixText } : undefined });
  const tokSpan = (t: Token): Span => ({ line: t.line, from: t.from, to: t.to });
  const suggestFix = (t: Token, candidates: Iterable<string>) => {
    const c = closest(t.value, candidates);
    return c ? { hint: `Did you mean "${c}"?`, fix: c } : { hint: undefined, fix: undefined };
  };

  const ensureNode = (id: string, span: Span, line: number) => {
    if (nodeIndex.has(id)) return;
    nodeIndex.set(id, doc.nodes.length);
    doc.nodes.push({ id, shape: 'box', label: humanize(id), line, span, order, implicit: true });
  };

  tokenLines.forEach((all, i) => {
    const lineNo = i + 1;
    const text = lines[i];
    const comment = all.find((t) => t.type === 'comment');
    const toks = all.filter((t) => t.type !== 'comment');
    if (!toks.length) return;
    const span: Span = { line: lineNo, from: toks[0].from, to: toks[toks.length - 1].to };
    const err = (code: string, message: string, at: Span = span, hint?: string, fix?: string) =>
      report('error', code, message, at, hint, fix);

    const broken = toks.find((t) => t.error);
    if (broken) {
      err('E-UNCLOSED-STRING', broken.error!, tokSpan(broken), 'Add a " at the end of the text.');
      return;
    }

    /** Raw text after token `t` up to the end of the line (before any comment). */
    const restAfter = (t: Token) => {
      const lineOffset = toks[0].from - text.search(/\S/);
      const end = comment ? comment.from - lineOffset : text.length;
      return text.slice(t.to - lineOffset, end).trim();
    };
    const unquote = (s: string) => {
      const t = s.trim();
      const body = t.length >= 2 && t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
      return body.replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c));
    };

    const [t0, t1] = toks;
    const firstIsWord = t0.type === 'ident';
    const notDefinition = !t1 || (t1.type !== 'colon' && t1.type !== 'arrow');

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
      const options: Record<string, string[]> = {
        layout: ['right', 'down'],
        direction: ['right', 'down'],
        paper: Object.keys(PAPERS),
        pen: Object.keys(PENS),
        hand: Object.keys(HANDS),
      };
      if (options[key]) {
        if (!options[key].includes(v)) {
          const s = suggestFix(t1, options[key]);
          const what = key === 'layout' || key === 'direction' ? `Layout can be "right" or "down", not "${v}".` : `No ${key === 'hand' ? 'handwriting' : key} called "${v}".`;
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

    // ── Arrows and chains: a -> b ~> c : label ─────────────────────────
    const colonAt = toks.findIndex((t) => t.type === 'colon');
    const head = colonAt === -1 ? toks : toks.slice(0, colonAt);
    if (head.some((t) => t.type === 'arrow')) {
      order++;
      const ok = head.length >= 3 && head.length % 2 === 1 && head.every((t, k) => (k % 2 === 0 ? isId(t) : t.type === 'arrow'));
      if (!ok) {
        const bad = head.find((t, k) => (k % 2 === 0 ? !isId(t) : t.type !== 'arrow'));
        if (bad && bad.type === 'word')
          err('E-BAD-NAME', `"${bad.text}" is not a valid name. Use letters, digits, - or _, or put it in quotes.`, tokSpan(bad));
        else err('E-ARROW-NEEDS-ENDS', 'An arrow needs a name on both sides, like "a -> b".', span);
        return;
      }
      const label = colonAt !== -1 ? unquote(restAfter(toks[colonAt])) : undefined;
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
          line: lineNo,
          span,
          order,
        });
      }
      return;
    }

    // ── Node definitions: id : shape "Label" colour ────────────────────
    if (isId(t0) && t1?.type === 'colon') {
      order++;
      const id = t0.value;
      const body = toks.slice(2);
      let k = 0;
      let shapeTok: Token | undefined;
      let labelTok: Token | undefined;
      let fillTok: Token | undefined;
      if (body[k]?.type === 'ident') shapeTok = body[k++];
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
          const s = suggestFix(shapeTok, shapeNames);
          err('E-UNKNOWN-SHAPE', `No shape called "${shapeTok.value}".`, tokSpan(shapeTok), s.hint ?? `Try: ${SHAPES.join(', ')}.`, s.fix);
          return;
        }
      }
      if (fillTok && !COLORS[fillTok.value]) {
        const s = suggestFix(fillTok, Object.keys(COLORS));
        err('E-UNKNOWN-COLOR', `No colour called "${fillTok.value}".`, tokSpan(fillTok), s.hint ?? `Try: ${Object.keys(COLORS).join(', ')}.`, s.fix);
        return;
      }
      const shape: Shape = shapeTok ? (SHAPE_ALIASES[shapeTok.value] ?? (shapeTok.value as Shape)) : 'box';
      const def = {
        id,
        shape,
        label: labelTok ? labelTok.value : humanize(id),
        fill: fillTok?.value,
        line: lineNo,
        span,
        order,
      };
      const existing = nodeIndex.get(id);
      if (existing !== undefined) {
        if (!doc.nodes[existing].implicit)
          err('E-DUPLICATE-NODE', `"${id}" is already defined on line ${doc.nodes[existing].line}.`, tokSpan(t0), 'Rename one of them, or delete this line.');
        doc.nodes[existing] = def;
      } else {
        nodeIndex.set(id, doc.nodes.length);
        doc.nodes.push(def);
      }
      return;
    }

    // ── Marks: circle x, note x "text", highlight x pink @3 ────────────
    if (firstIsWord && (MARKS as string[]).includes(t0.value) && isId(t1)) {
      order++;
      const kind = t0.value as AnnotationKind;
      let text: string | undefined;
      let at: number | undefined;
      let color: string | undefined;
      for (const t of toks.slice(2)) {
        if (t.type === 'string' && text === undefined) text = t.value;
        else if (t.type === 'at') at = Number(t.value);
        else if (t.type === 'ident' && COLORS[t.value]) color = t.value;
        else {
          const s = t.type === 'ident' ? suggestFix(t, Object.keys(COLORS)) : { hint: undefined, fix: undefined };
          err('E-UNEXPECTED', `I don't understand "${t.text}" here.`, tokSpan(t), s.hint, s.fix);
          return;
        }
      }
      if (kind === 'note' && !text) {
        err('E-NOTE-NEEDS-TEXT', `A note needs text, like  note ${t1.value} "remember this"`, span);
        return;
      }
      doc.annotations.push({ kind, target: t1.value, text, color, at, line: lineNo, span, order });
      return;
    }

    // ── Nothing matched ────────────────────────────────────────────────
    const hint = firstIsWord ? didYouMean(t0.value, KEYWORDS) : undefined;
    err('E-UNKNOWN-LINE', "I don't understand this line.", span, hint);
  });

  // References, now that every node is known.
  const ids = () => nodeIndex.keys();
  doc.annotations = doc.annotations.filter((a) => {
    if (nodeIndex.has(a.target)) return true;
    const c = closest(a.target, ids());
    report('error', 'E-UNKNOWN-TARGET', `There is no node called "${a.target}".`, a.span, c ? `Did you mean "${c}"?` : undefined);
    return false;
  });
  for (const s of doc.steps) {
    for (const id of s.items.filter((x) => !nodeIndex.has(x))) {
      const c = closest(id, ids());
      report('warning', 'W-STEP-UNKNOWN', `Step ${s.index} names "${id}", which is not a node.`, s.span, c ? `Did you mean "${c}"?` : undefined);
    }
    s.items = s.items.filter((id) => nodeIndex.has(id));
  }
  doc.steps.sort((a, b) => a.index - b.index);
  doc.diagnostics.sort((a, b) => a.span.from - b.span.from);
  return doc;
}
