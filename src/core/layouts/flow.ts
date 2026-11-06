import dagre from '@dagrejs/dagre';
import { measure } from '../measure';
import type { LayoutFn, Pt, SceneNode } from '../scene';
import { sizeNodes, textMetrics, titleHeight } from './shared';

/** Boxes and arrows, ranked left to right or top to bottom by dagre. */
export const flow: LayoutFn = (doc) => {
  const { px, family, weight } = textMetrics(doc);

  // Edge labels sit beside their line, so leave room for the widest one between ranks.
  const labelSizes = doc.edges.map((e) => (e.label ? measure(e.label, px * 0.82, family, weight) : null));
  const widest = Math.max(0, ...labelSizes.map((l) => (l ? l.w : 0)));
  const tallest = Math.max(0, ...labelSizes.map((l) => (l ? l.h : 0)));
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: doc.direction === 'down' ? 'TB' : 'LR',
    nodesep: doc.direction === 'down' ? 56 : 40,
    ranksep: doc.direction === 'down' ? Math.max(62, tallest * 2 + 36) : Math.min(240, Math.max(78, widest + 40)),
    edgesep: 24,
    marginx: 36,
    marginy: 36,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const sized = sizeNodes(doc);
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
    layout: 'flow',
    nodes,
    edges,
    decorations: [],
    width: graph.width ?? 200,
    height: graph.height ?? 120,
    titleH: titleHeight(doc),
    fontPx: px,
    family,
    weight,
    humanise: { tilt: 3.2, stickyTilt: 7, jitterX: 16, jitterY: 12 },
  };
};
