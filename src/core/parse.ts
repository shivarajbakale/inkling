import { COLORS, DEFAULTS, HANDS, PAPERS, PENS } from './styles';
import type { AnnotationKind, Doc, EdgeKind, Shape } from './types';

const SHAPES: Shape[] = ['box', 'round', 'circle', 'diamond', 'cloud', 'db', 'sticky', 'person', 'text'];
const SHAPE_ALIASES: Record<string, Shape> = {
  rect: 'box',
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
const ANNOTATIONS: AnnotationKind[] = ['circle', 'underline', 'strike', 'highlight', 'note', 'cross', 'check'];

const ID = '[A-Za-z_][\\w-]*';
const ARROW = /\s*(<~>|<->|-->|->|~>)\s*/;

/** Removes a `#` comment, ignoring `#` inside quotes. */
function stripComment(line: string): string {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === '#' && !quoted && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

/** Splits at the first `:` that is outside quotes. */
function splitColon(line: string): [string, string | undefined] {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === ':' && !quoted) return [line.slice(0, i), line.slice(i + 1)];
  }
  return [line, undefined];
}

function unquote(s: string): string {
  const t = s.trim();
  const body = t.startsWith('"') && t.endsWith('"') && t.length >= 2 ? t.slice(1, -1) : t;
  return body.replace(/\\n/g, '\n');
}

function humanize(id: string): string {
  return id.replace(/[-_]+/g, ' ');
}

export function parse(source: string): Doc {
  const doc: Doc = {
    ...DEFAULTS,
    nodes: [],
    edges: [],
    annotations: [],
    steps: [],
    errors: [],
  };
  const nodeIndex = new Map<string, number>();

  const ensureNode = (id: string, line: number) => {
    if (nodeIndex.has(id)) return;
    nodeIndex.set(id, doc.nodes.length);
    doc.nodes.push({ id, shape: 'box', label: humanize(id), line, implicit: true });
  };

  const lines = source.split('\n');
  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    const line = stripComment(raw).trim();
    if (!line) return;
    const err = (message: string) => doc.errors.push({ line: lineNo, message });

    let m: RegExpMatchArray | null;

    // Settings
    if ((m = line.match(/^title\s+(.+)$/))) {
      doc.title = unquote(m[1]);
      return;
    }
    if ((m = line.match(/^(?:layout|direction)\s+(\w+)$/))) {
      const v = m[1];
      if (v === 'right' || v === 'down') doc.direction = v;
      else err(`Layout can be "right" or "down", not "${v}".`);
      return;
    }
    if ((m = line.match(/^paper\s+([\w-]+)$/))) {
      if (PAPERS[m[1]]) doc.paper = m[1];
      else err(`No paper called "${m[1]}". Try: ${Object.keys(PAPERS).join(', ')}.`);
      return;
    }
    if ((m = line.match(/^pen\s+([\w-]+)$/))) {
      if (PENS[m[1]]) doc.pen = m[1];
      else err(`No pen called "${m[1]}". Try: ${Object.keys(PENS).join(', ')}.`);
      return;
    }
    if ((m = line.match(/^hand\s+([\w-]+)$/))) {
      if (HANDS[m[1]]) doc.hand = m[1];
      else err(`No handwriting called "${m[1]}". Try: ${Object.keys(HANDS).join(', ')}.`);
      return;
    }
    if ((m = line.match(/^mess\s+([\d.]+)$/))) {
      const v = Number(m[1]);
      if (v >= 0 && v <= 1) doc.mess = v;
      else err('Mess is a number from 0 (tidy) to 1 (chaotic).');
      return;
    }
    if ((m = line.match(/^seed\s+(\d+)$/))) {
      doc.seed = Number(m[1]);
      return;
    }

    // Steps: step 2: a, b "caption"
    if ((m = line.match(/^step\s+(\d+)\s*:?\s*(.*)$/))) {
      let rest = m[2];
      let caption: string | undefined;
      const cap = rest.match(/"([^"]*)"\s*$/);
      if (cap) {
        caption = cap[1];
        rest = rest.slice(0, cap.index);
      }
      const items = rest.split(/[,\s]+/).filter(Boolean);
      doc.steps.push({ index: Number(m[1]), items, caption, line: lineNo });
      return;
    }

    // Edges and chains: a -> b ~> c : label
    if (ARROW.test(splitColon(line)[0])) {
      const [lhs, labelPart] = splitColon(line);
      const parts = lhs.split(ARROW).map((p) => p.trim());
      if (parts.length < 3 || parts.length % 2 === 0) {
        err('An arrow needs a name on both sides, like "a -> b".');
        return;
      }
      const label = labelPart !== undefined ? unquote(labelPart) : undefined;
      for (let k = 0; k + 2 < parts.length; k += 2) {
        const from = parts[k];
        const op = parts[k + 1];
        const to = parts[k + 2];
        if (!new RegExp(`^${ID}$`).test(from) || !new RegExp(`^${ID}$`).test(to)) {
          err(`"${!new RegExp(`^${ID}$`).test(from) ? from : to}" is not a valid name. Use letters, digits, - or _.`);
          return;
        }
        ensureNode(from, lineNo);
        ensureNode(to, lineNo);
        const kind: EdgeKind = op.includes('~') ? 'squiggle' : op === '-->' ? 'dashed' : 'solid';
        doc.edges.push({
          from,
          to,
          kind,
          both: op.startsWith('<'),
          label: k + 2 === parts.length - 1 ? label : undefined,
          line: lineNo,
        });
      }
      return;
    }

    // Node definitions: id : shape "Label" fill
    const [head, tail] = splitColon(line);
    if (tail !== undefined && new RegExp(`^${ID}$`).test(head.trim())) {
      const id = head.trim();
      const body = tail.trim();
      const bm = body.match(/^([A-Za-z]+)?\s*("(?:[^"]*)")?\s*([A-Za-z]+)?$/);
      if (!bm) {
        err(`Write a node as  ${id}: box "Label"`);
        return;
      }
      let shapeWord: string | undefined = bm[1];
      let label = bm[2] ? unquote(bm[2]) : undefined;
      let fill = bm[3];
      // `id: "Label" yellow` has no shape word
      if (shapeWord && !SHAPES.includes(shapeWord as Shape) && !SHAPE_ALIASES[shapeWord]) {
        if (!label && COLORS[shapeWord]) {
          fill = shapeWord;
          shapeWord = undefined;
        } else {
          err(`No shape called "${shapeWord}". Try: ${SHAPES.join(', ')}.`);
          return;
        }
      }
      if (fill && !COLORS[fill]) {
        err(`No colour called "${fill}". Try: ${Object.keys(COLORS).join(', ')}.`);
        return;
      }
      const shape: Shape = shapeWord ? (SHAPE_ALIASES[shapeWord] ?? (shapeWord as Shape)) : 'box';
      label = label ?? humanize(id);
      const existing = nodeIndex.get(id);
      const def = { id, shape, label, fill, line: lineNo };
      if (existing !== undefined) {
        if (!doc.nodes[existing].implicit) err(`"${id}" is already defined on line ${doc.nodes[existing].line}.`);
        doc.nodes[existing] = def;
      } else {
        nodeIndex.set(id, doc.nodes.length);
        doc.nodes.push(def);
      }
      return;
    }

    // Annotations: circle x, note x "text", highlight x pink @3
    if ((m = line.match(new RegExp(`^(${ANNOTATIONS.join('|')})\\s+(${ID})(.*)$`)))) {
      const kind = m[1] as AnnotationKind;
      let rest = m[3];
      let text: string | undefined;
      const q = rest.match(/"([^"]*)"/);
      if (q) {
        text = q[1].replace(/\\n/g, '\n');
        rest = rest.replace(q[0], ' ');
      }
      let at: number | undefined;
      const a = rest.match(/@(\d+)/);
      if (a) {
        at = Number(a[1]);
        rest = rest.replace(a[0], ' ');
      }
      const words = rest.split(/\s+/).filter(Boolean);
      let color: string | undefined;
      for (const w of words) {
        if (COLORS[w]) color = w;
        else {
          err(`I don't understand "${w}" here.`);
          return;
        }
      }
      if (kind === 'note' && !text) {
        err(`A note needs text, like  note ${m[2]} "remember this"`);
        return;
      }
      doc.annotations.push({ kind, target: m[2], text, color, at, line: lineNo });
      return;
    }

    err(`I don't understand this line.`);
  });

  // Check references now that every node is known.
  for (const a of doc.annotations) {
    if (!nodeIndex.has(a.target)) doc.errors.push({ line: a.line, message: `There is no node called "${a.target}".` });
  }
  doc.annotations = doc.annotations.filter((a) => nodeIndex.has(a.target));
  for (const s of doc.steps) {
    const bad = s.items.filter((id) => !nodeIndex.has(id));
    for (const id of bad) doc.errors.push({ line: s.line, message: `Step ${s.index} names "${id}", which is not a node.` });
    s.items = s.items.filter((id) => nodeIndex.has(id));
  }
  doc.steps.sort((a, b) => a.index - b.index);
  doc.errors.sort((a, b) => a.line - b.line);
  return doc;
}

/**
 * Rewrites one setting line (`paper notebook`) in the source, or inserts it
 * after the title. Keeps code the single source of truth when a control changes.
 */
export function setDirective(source: string, key: string, value: string | number): string {
  const re = new RegExp(`^(\\s*)${key}\\s+[\\w.-]+\\s*$`, 'm');
  if (re.test(source)) return source.replace(re, `$1${key} ${value}`);
  const lines = source.split('\n');
  const titleAt = lines.findIndex((l) => /^\s*title\s/.test(l));
  let insertAt = titleAt + 1;
  while (insertAt < lines.length && /^\s*(paper|pen|hand|mess|seed|layout|direction)\s/.test(lines[insertAt])) insertAt++;
  lines.splice(insertAt, 0, `${key} ${value}`);
  return lines.join('\n');
}
