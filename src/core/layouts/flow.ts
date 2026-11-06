import dagre from '@dagrejs/dagre';
import { GROUP_PAD } from '../arrange';
import { measure } from '../measure';
import type { LayoutFn, Pt, SceneNode } from '../scene';
import type { Diagnostic, Doc } from '../types';
import { sizeNodes, textMetrics, titleHeight, type Sized } from './shared';

interface Spacing {
  rankdir: 'LR' | 'TB';
  nodesep: number;
  ranksep: number;
}

function spacing(doc: Doc): Spacing {
  const { px, family, weight } = textMetrics(doc);
  // Edge labels sit beside their line, so leave room for the widest one between ranks.
  const labelSizes = doc.edges.map((e) => (e.label ? measure(e.label, px * 0.82, family, weight) : null));
  const widest = Math.max(0, ...labelSizes.map((l) => (l ? l.w : 0)));
  const tallest = Math.max(0, ...labelSizes.map((l) => (l ? l.h : 0)));
  const down = doc.direction === 'down';
  return {
    rankdir: down ? 'TB' : 'LR',
    nodesep: down ? 56 : 40,
    ranksep: down ? Math.max(62, tallest * 2 + 36) : Math.min(240, Math.max(78, widest + 40)),
  };
}

function wideWarning(doc: Doc, positions: number[]): Diagnostic[] {
  const ranks = new Set(positions.map((x) => Math.round(x / 10)));
  if (doc.direction === 'down' || ranks.size <= 7 || !doc.nodes.length) return [];
  return [
    {
      code: 'W-WIDE',
      severity: 'warning',
      message: `This drawing is ${ranks.size} columns wide, which gets small on narrow screens.`,
      hint: 'Try  layout down  to stack it instead.',
      span: { line: 1, from: 0, to: 0 },
    },
  ];
}

/** Boxes and arrows, ranked left to right or top to bottom by dagre. */
export const flow: LayoutFn = (doc) => {
  const { px, family, weight } = textMetrics(doc);
  const sp = spacing(doc);
  const sized = sizeNodes(doc);
  const base = {
    layout: 'flow',
    decorations: [],
    groups: [],
    labels: new Map(),
    titleH: titleHeight(doc),
    fontPx: px,
    family,
    weight,
    humanise: { tilt: 3.2, stickyTilt: 7, jitterX: 16, jitterY: 12 },
  };
  if (doc.groups.length) return { ...base, ...grouped(doc, sized, sp) };

  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ ...sp, edgesep: 24, marginx: 36, marginy: 36 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const def of doc.nodes) {
    const s = sized.get(def.id)!;
    g.setNode(def.id, { width: s.w, height: s.h });
  }
  doc.edges.forEach((e, i) => g.setEdge(e.from, e.to, { width: 0, height: 0 }, `e${i}`));
  dagre.layout(g);

  const nodes = new Map<string, SceneNode>();
  for (const def of doc.nodes) {
    const p = g.node(def.id);
    const s = sized.get(def.id)!;
    nodes.set(def.id, { def, cx: p.x, cy: p.y, w: s.w, h: s.h, rotate: 0, labelDy: s.labelDy, labelW: s.lw, labelH: s.lh });
  }
  const edges = doc.edges.map((def, index) => {
    const de = g.edge({ v: def.from, w: def.to, name: `e${index}` }) as { points: { x: number; y: number }[] };
    // dagre gives a single midpoint for neighbours; treat that as a direct line.
    const mids = de.points.slice(1, -1).map((p) => [p.x, p.y] as Pt);
    return { index, def, route: mids.length <= 1 ? [] : mids, points: [] as Pt[], bend: 0 };
  });
  const graph = g.graph();
  return {
    ...base,
    nodes,
    edges,
    width: graph.width ?? 200,
    height: graph.height ?? 120,
    warnings: wideWarning(doc, doc.nodes.map((d) => g.node(d.id).x)),
  };
};

/**
 * With groups, each group is laid out on its own first, then placed in its
 * parent as a single box. This keeps groups compact; dagre's own cluster
 * support spreads them several times wider.
 */
function grouped(doc: Doc, sized: Map<string, Sized>, sp: Spacing) {
  const { px, family, weight } = textMetrics(doc);
  const tabH = measure('Hg', px * 0.8, family, Math.min(700, weight + 200)).h + 6;
  const parentOf = new Map<string, string | undefined>();
  for (const n of doc.nodes) parentOf.set(n.id, n.group);
  for (const g of doc.groups) parentOf.set(g.id, g.parent);
  const groupIds = new Set(doc.groups.map((g) => g.id));

  /** The item at `level` (a group id, or undefined for the top) that contains `id`. */
  const itemAt = (id: string, level: string | undefined): string | undefined => {
    let cur: string | undefined = id;
    while (cur !== undefined) {
      const p = parentOf.get(cur);
      if (p === level) return cur;
      cur = p;
    }
    return undefined;
  };

  /** Relative positions of everything inside `level`, and its size. */
  interface Placed {
    w: number;
    h: number;
    pos: Map<string, Pt>;
  }
  const memo = new Map<string | undefined, Placed>();
  const place = (level: string | undefined): Placed => {
    const hit = memo.get(level);
    if (hit) return hit;
    const items = [...doc.nodes.map((n) => n.id), ...doc.groups.map((g) => g.id)].filter((id) => parentOf.get(id) === level);
    const g = new dagre.graphlib.Graph({ multigraph: true });
    g.setGraph({ ...sp, edgesep: 24, marginx: 0, marginy: 0 });
    g.setDefaultEdgeLabel(() => ({}));
    const sizes = new Map<string, { w: number; h: number }>();
    for (const id of items) {
      if (groupIds.has(id)) {
        const inner = place(id);
        const label = doc.groups.find((x) => x.id === id)!.label;
        const tw = measure(label, px * 0.8, family, Math.min(700, weight + 200)).w + 28;
        sizes.set(id, { w: Math.max(inner.w + GROUP_PAD * 2, tw), h: inner.h + GROUP_PAD * 2 + tabH });
      } else {
        const s = sized.get(id)!;
        sizes.set(id, { w: s.w, h: s.h });
      }
      g.setNode(id, { width: sizes.get(id)!.w, height: sizes.get(id)!.h });
    }
    doc.edges.forEach((e, i) => {
      const a = itemAt(e.from, level);
      const b = itemAt(e.to, level);
      if (a && b && a !== b) g.setEdge(a, b, {}, `e${i}`);
    });
    dagre.layout(g);
    const pos = new Map<string, Pt>();
    for (const id of items) {
      const p = g.node(id);
      if (groupIds.has(id)) {
        // Members sit inside the group's box, below its name.
        const inner = place(id);
        const s = sizes.get(id)!;
        const ox = p.x - inner.w / 2;
        const oy = p.y - s.h / 2 + GROUP_PAD + tabH;
        for (const [cid, [x, y]] of inner.pos) pos.set(cid, [ox + x, oy + y]);
      } else pos.set(id, [p.x, p.y]);
    }
    const graph = g.graph();
    const out = { w: graph.width ?? 0, h: graph.height ?? 0, pos };
    memo.set(level, out);
    return out;
  };

  const top = place(undefined);
  const margin = 36;
  const nodes = new Map<string, SceneNode>();
  for (const def of doc.nodes) {
    const [x, y] = top.pos.get(def.id) ?? [0, 0];
    const s = sized.get(def.id)!;
    nodes.set(def.id, { def, cx: x + margin, cy: y + margin, w: s.w, h: s.h, rotate: 0, labelDy: s.labelDy, labelW: s.lw, labelH: s.lh });
  }
  // Arrows across groups are drawn direct; the router bends them around anything in the way.
  const edges = doc.edges.map((def, index) => ({ index, def, route: [] as Pt[], points: [] as Pt[], bend: 0 }));
  return {
    nodes,
    edges,
    width: top.w + margin * 2,
    height: top.h + margin * 2,
    warnings: wideWarning(doc, [...nodes.values()].map((n) => n.cx)),
  };
}
