import { measure } from '../measure';
import { HANDS, SIZES } from '../styles';
import { decorationBox, type Scene, type SceneNode } from '../scene';
import type { Doc, NodeDef } from '../types';

export const BASE_SIZE = 19;

export interface Sized {
  w: number;
  h: number;
  labelDy: number;
  lw: number;
  lh: number;
}

/** Text style shared by every layout. */
export function textMetrics(doc: Doc) {
  const hand = HANDS[doc.hand];
  return { px: BASE_SIZE * hand.scale, family: hand.family, weight: hand.weight };
}

export function shapeSize(def: NodeDef, lw: number, lh: number): { w: number; h: number; labelDy: number } {
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
    case 'icon': {
      const fig = 44;
      return { w: Math.max(lw + 8, 54), h: fig + lh + 6, labelDy: fig / 2 + 4 };
    }
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


/** Measures every node's label and works out its box. */
export function sizeNodes(doc: Doc): Map<string, Sized> {
  const { px, family, weight } = textMetrics(doc);
  const out = new Map<string, Sized>();
  for (const def of doc.nodes) {
    const k = SIZES[def.size ?? 'normal'] ?? 1;
    const { w: lw, h: lh } = measure(def.label, px * k, family, weight);
    // Size the shape at normal size, then scale it, so padding grows with the text.
    const s = shapeSize(def, lw / k, lh / k);
    out.set(def.id, { lw, lh, w: s.w * k, h: s.h * k, labelDy: s.labelDy * k });
  }
  return out;
}

export function titleHeight(doc: Doc): number {
  return doc.title ? textMetrics(doc).px * 1.7 + 30 : 0;
}

/** Size of one node definition (which may be a layout's restyled copy). */
export function sizeDef(doc: Doc, def: NodeDef): Sized {
  const { px, family, weight } = textMetrics(doc);
  const k = SIZES[def.size ?? 'normal'] ?? 1;
  const { w: lw, h: lh } = measure(def.label || ' ', px * k, family, weight);
  const s = shapeSize(def, lw / k, lh / k);
  return { lw: def.label ? lw : 0, lh: def.label ? lh : 0, w: s.w * k, h: s.h * k, labelDy: s.labelDy * k };
}

/** Everything a scene needs besides nodes and edges, for a layout to fill in. */
export function emptyScene(doc: Doc, name: string, humanise: Scene['humanise']): Scene {
  const { px, family, weight } = textMetrics(doc);
  return {
    layout: name,
    nodes: new Map(),
    edges: doc.edges.map((def, index) => ({ index, def, route: [], points: [], bend: 0 })),
    decorations: [],
    groups: [],
    labels: new Map(),
    warnings: [],
    width: 0,
    height: 0,
    titleH: titleHeight(doc),
    fontPx: px,
    family,
    weight,
    humanise,
    defs: new Map(),
  };
}

/** Puts a node into the scene at a centre, using its own size unless one is given. */
export function placeNode(scene: Scene, doc: Doc, def: NodeDef, cx: number, cy: number, size?: Partial<Sized>): SceneNode {
  const s = { ...sizeDef(doc, def), ...size };
  const n: SceneNode = { def, cx, cy, w: s.w, h: s.h, rotate: 0, labelDy: s.labelDy, labelW: s.lw, labelH: s.lh };
  scene.nodes.set(def.id, n);
  if (scene.defs && def !== doc.nodes.find((d) => d.id === def.id)) scene.defs.set(def.id, def);
  return n;
}

/** Sets width and height to cover every node and decoration, plus a margin. */
export function fitScene(scene: Scene, margin = 36) {
  let w = 0;
  let h = 0;
  for (const n of scene.nodes.values()) {
    w = Math.max(w, n.cx + n.w / 2);
    h = Math.max(h, n.cy + n.h / 2);
  }
  for (const d of scene.decorations) {
    const b = decorationBox(d);
    if (b) {
      w = Math.max(w, b.x + b.w);
      h = Math.max(h, b.y + b.h);
    }
  }
  scene.width = w + margin;
  scene.height = h + margin;
}

export function warn(scene: Scene, code: string, message: string, hint?: string) {
  scene.warnings.push({ code, severity: 'warning', message, hint, span: { line: 1, from: 0, to: 0 } });
}

/** Nodes in source order, for layouts where that order is the reading order. */
export const inOrder = (doc: Doc) => [...doc.nodes].sort((a, b) => a.order - b.order);
