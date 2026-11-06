import type { Doc, EdgeDef, NodeDef } from './types';

/**
 * The scene: everything a layout decides, before any ink. Every layout
 * produces one; the humaniser, the router and the drawing all consume it.
 */

export type Pt = [number, number];

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SceneNode {
  def: NodeDef;
  /** Centre. Layouts set it; the humaniser nudges it. */
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

export interface SceneEdge {
  index: number;
  def: EdgeDef;
  /** Bend points chosen by the layout, between the two ends. Empty for a direct line. */
  route: Pt[];
  /** The final line, end to end, set by the router. */
  points: Pt[];
  /** Sideways offset of a direct line's midpoint; its sign says which side the label goes. */
  bend: number;
}

/** Extra ink a layout needs that is not a node or an arrow. Layouts add kinds as they need them. */
export type Decoration = { kind: 'line'; points: Pt[]; dashed?: boolean; step?: number };

/** How far the humaniser may move things in this layout, at mess 1. */
export interface HumaniseLimits {
  tilt: number;
  stickyTilt: number;
  jitterX: number;
  jitterY: number;
}

export interface Scene {
  layout: string;
  nodes: Map<string, SceneNode>;
  edges: SceneEdge[];
  decorations: Decoration[];
  width: number;
  height: number;
  titleH: number;
  fontPx: number;
  family: string;
  weight: number;
  humanise: HumaniseLimits;
}

/** A layout places things. It never draws and never adds randomness. */
export type LayoutFn = (doc: Doc) => Scene;

/** Where the line from the centre toward (tx, ty) leaves the shape, plus a gap. */
export function boundaryPoint(n: SceneNode, tx: number, ty: number, gap = 7): [number, number] {
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

