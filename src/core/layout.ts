import dagre from '@dagrejs/dagre';
import { rng } from './rng';
import { HANDS } from './styles';
import type { Doc, NodeDef } from './types';

export const BASE_SIZE = 19;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LaidNode {
  def: NodeDef;
  /** Centre after the human jitter. */
  cx: number;
  cy: number;
  w: number;
  h: number;
  rotate: number;
  /** Where the label sits, relative to the centre. */
  labelDy: number;
  labelW: number;
  labelH: number;
}

export interface LaidEdge {
  index: number;
  points: [number, number][];
  /** Sideways offset of a straight arrow's midpoint; its sign says which side the label goes. */
  bend: number;
}

export interface Layout {
  nodes: Map<string, LaidNode>;
  edges: LaidEdge[];
  width: number;
  height: number;
  titleH: number;
  fontPx: number;
  family: string;
  weight: number;
}

let ctx: CanvasRenderingContext2D | null = null;

export function measure(text: string, px: number, family: string, weight: number): { w: number; h: number } {
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  const lines = text.split('\n');
  let w = 0;
  if (ctx) {
    ctx.font = `${weight} ${px}px '${family}', cursive`;
    for (const l of lines) w = Math.max(w, ctx.measureText(l).width);
  } else {
    w = Math.max(...lines.map((l) => l.length)) * px * 0.5;
  }
  // per-letter jitter widens a line slightly
  return { w: w * 1.04 + 2, h: lines.length * px * 1.12 };
}

function shapeSize(def: NodeDef, lw: number, lh: number): { w: number; h: number; labelDy: number } {
  switch (def.shape) {
    case 'circle': {
      const w = Math.max(lw * 1.35 + 26, lh * 1.4 + 30, 72);
      const h = Math.max(lh * 1.5 + 26, w * 0.62);
      return { w, h, labelDy: 0 };
    }
    case 'diamond':
      return { w: lw * 1.6 + 40, h: Math.max(lh * 2 + 34, 70), labelDy: 0 };
    case 'cloud':
      return { w: lw * 1.3 + 64, h: lh + 66, labelDy: 2 };
    case 'db':
      return { w: Math.max(lw + 44, 80), h: lh + 62, labelDy: 8 };
    case 'sticky':
      return { w: Math.max(lw + 34, 116), h: Math.max(lh + 36, 96), labelDy: 0 };
    case 'person': {
      const fig = 66;
      return { w: Math.max(lw + 8, 54), h: fig + lh + 4, labelDy: fig / 2 + 4 };
    }
    case 'text':
      return { w: lw + 10, h: lh + 8, labelDy: 0 };
    case 'round':
      return { w: lw + 48, h: lh + 28, labelDy: 0 };
    default:
      return { w: lw + 40, h: lh + 28, labelDy: 0 };
  }
}

/** Where the line from the centre toward (tx, ty) leaves the shape, plus a gap. */
export function boundaryPoint(n: LaidNode, tx: number, ty: number, gap = 7): [number, number] {
  const dx = tx - n.cx;
  const dy = ty - n.cy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const hw = n.w / 2;
  const hh = n.h / 2;
  let t: number;
  if (n.def.shape === 'circle' || n.def.shape === 'cloud') {
    t = 1 / Math.sqrt((ux * ux) / (hw * hw) + (uy * uy) / (hh * hh));
  } else if (n.def.shape === 'diamond') {
    t = 1 / (Math.abs(ux) / hw + Math.abs(uy) / hh);
  } else {
    t = Math.min(ux === 0 ? Infinity : hw / Math.abs(ux), uy === 0 ? Infinity : hh / Math.abs(uy));
  }
  return [n.cx + ux * (t + gap), n.cy + uy * (t + gap)];
}

export function layout(doc: Doc): Layout {
  const hand = HANDS[doc.hand];
  const px = BASE_SIZE * hand.scale;
  const rand = rng(doc.seed * 7919 + 13);

  // Edge labels sit beside their line, so leave room for the widest one between ranks.
  const labelSizes = doc.edges.map((e) => (e.label ? measure(e.label, px * 0.82, hand.family, hand.weight) : null));
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

  const measured = new Map<string, { lw: number; lh: number; w: number; h: number; labelDy: number }>();
  for (const def of doc.nodes) {
    const { w: lw, h: lh } = measure(def.label, px, hand.family, hand.weight);
    const s = shapeSize(def, lw, lh);
    measured.set(def.id, { lw, lh, ...s });
    g.setNode(def.id, { width: s.w, height: s.h });
  }
  doc.edges.forEach((e, i) => g.setEdge(e.from, e.to, { width: 0, height: 0 }, `e${i}`));

  dagre.layout(g);

  const jitter = doc.mess;
  const nodes = new Map<string, LaidNode>();
  for (const def of doc.nodes) {
    const p = g.node(def.id);
    const m = measured.get(def.id)!;
    const rot = def.shape === 'sticky' ? (rand() - 0.5) * 7 : (rand() - 0.5) * 3.2 * jitter;
    nodes.set(def.id, {
      def,
      cx: p.x + (rand() - 0.5) * 16 * jitter,
      cy: p.y + (rand() - 0.5) * 12 * jitter,
      w: m.w,
      h: m.h,
      rotate: rot,
      labelDy: m.labelDy,
      labelW: m.lw,
      labelH: m.lh,
    });
  }

  // Several arrows between the same two nodes fan out instead of overlapping.
  const pairCount = new Map<string, number>();
  const pairSeen = new Map<string, number>();
  const pairKey = (x: string, y: string) => (x < y ? `${x}\u0000${y}` : `${y}\u0000${x}`);
  doc.edges.forEach((e) => pairCount.set(pairKey(e.from, e.to), (pairCount.get(pairKey(e.from, e.to)) ?? 0) + 1));

  const edges: LaidEdge[] = doc.edges.map((e, index) => {
    const de = g.edge({ v: e.from, w: e.to, name: `e${index}` }) as { points: { x: number; y: number }[] };
    const a = nodes.get(e.from)!;
    const b = nodes.get(e.to)!;
    let mids = de.points.slice(1, -1).map((p) => [p.x, p.y] as [number, number]);
    if (mids.length <= 1) mids = [];
    let points: [number, number][];
    let bend = 0;
    if (e.from === e.to) {
      const r = Math.max(a.w, a.h) * 0.45;
      points = [
        boundaryPoint(a, a.cx + a.w, a.cy - a.h * 2),
        [a.cx + a.w / 2 + r, a.cy - a.h / 2 - r],
        boundaryPoint(a, a.cx + a.w * 2, a.cy - a.h * 0.2),
      ];
    } else if (mids.length === 0) {
      const key = pairKey(e.from, e.to);
      const n = pairCount.get(key)!;
      const k = pairSeen.get(key) ?? 0;
      pairSeen.set(key, k + 1);
      const len = Math.hypot(b.cx - a.cx, b.cy - a.cy) || 1;
      if (n > 1) {
        // Offsets are measured on the pair's canonical direction, then flipped for reverse arrows.
        const sign = e.from < e.to ? 1 : -1;
        bend = (k - (n - 1) / 2) * 40 * sign;
      } else {
        bend = (rand() - 0.5) * len * 0.08 * (0.4 + doc.mess);
      }
      const ux = (b.cx - a.cx) / len;
      const uy = (b.cy - a.cy) / len;
      const ctrl: [number, number] = [(a.cx + b.cx) / 2 - uy * bend, (a.cy + b.cy) / 2 + ux * bend];
      points = [boundaryPoint(a, ctrl[0], ctrl[1]), ctrl, boundaryPoint(b, ctrl[0], ctrl[1], 9)];
    } else {
      points = [boundaryPoint(a, mids[0][0], mids[0][1]), ...mids, boundaryPoint(b, mids[mids.length - 1][0], mids[mids.length - 1][1], 9)];
    }
    return { index, points, bend };
  });

  const graph = g.graph();
  const titleH = doc.title ? px * 1.7 + 30 : 0;
  return {
    nodes,
    edges,
    width: (graph.width ?? 200) + 0,
    height: (graph.height ?? 120) + 0,
    titleH,
    fontPx: px,
    family: hand.family,
    weight: hand.weight,
  };
}
