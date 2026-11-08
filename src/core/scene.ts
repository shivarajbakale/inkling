import { measure } from './measure';
import type { Diagnostic, Doc, EdgeDef, GroupDef, NodeDef } from './types';

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
  /** The layout set `points` itself; the router leaves them alone. */
  fixed?: boolean;
  /** `hidden`: not drawn (the layout draws the connection another way). `plain`: no arrowheads. */
  style?: 'arrow' | 'plain' | 'hidden';
}

export interface SceneGroup {
  def: GroupDef;
  /** The dashed frame. */
  box: Box;
  /** The handwritten name, inside the frame's top-left corner. */
  tab: Box;
}

/** A label whose position the label pass chose: an arrow's label or a note. */
export interface PlacedLabel {
  key: string;
  text: string;
  px: number;
  box: Box;
  /** Where a note's arrow should point, when not at its target's edge (a lifeline). */
  anchor?: Pt;
  /** Drawn as a note card with no arrow (a sequence note over lifelines). */
  card?: boolean;
}

/** What a decoration belongs to, so it appears in the right step. */
export interface Owner {
  node?: string;
  edge?: number;
  /** With `steps auto`: the step this belongs to, when it has no node or arrow (a chart's levels). */
  step?: number;
}

/** Extra ink a layout needs that is not a node or an arrow. */
export type Decoration = (
  | { kind: 'line'; points: Pt[]; dashed?: boolean; arrow?: boolean; width?: number; color?: 'ink' | 'mark' | string; smooth?: boolean; /** Straight segments between the points (data), never a curve through them. */ straight?: boolean }
  | { kind: 'brace'; from: Pt; to: Pt; /** Which way the point of the brace faces. */ toward: Pt }
  | { kind: 'text'; x: number; y: number; text: string; px: number; bold?: boolean; anchor?: 'middle' | 'start'; color?: 'ink' | 'mark' | string }
  | { kind: 'branch'; points: Pt[]; w0: number; w1: number; color?: string }
  | { kind: 'box'; box: Box; dashed?: boolean; fill?: string; /** Ink name for the outline. */ color?: string; /** Hatch the fill instead of painting it. */ hachure?: boolean; /** No outline, only the fill. */ bare?: boolean; /** Only the outline matters to labels: they may sit inside (a sequence frame). */ frame?: boolean }
  | { kind: 'ring'; cx: number; cy: number; rx: number; ry: number; color?: 'ink' | 'mark' }
  | { kind: 'zigzag'; at: Pt; vertical: boolean }
  /** A venn set: a circle in its own ink, hatched with its own colour. */
  | { kind: 'disc'; cx: number; cy: number; r: number; color?: string; fill?: string; /** Filled with its ink: a dot. */ solid?: boolean }
  /** A venn overlap, hatched: inside every `in` circle and outside every `out` one. */
  | { kind: 'region'; in: { cx: number; cy: number; r: number }[]; out: { cx: number; cy: number; r: number }[]; fill: string }
) & { owner?: Owner };

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
  groups: SceneGroup[];
  /** Arrow labels (`edge:<index>`) and notes (`note:<annotation index>`), set by the label pass. */
  labels: Map<string, PlacedLabel>;
  titleBox?: Box;
  /** Problems the layout noticed, such as a very wide graph. */
  warnings: Diagnostic[];
  width: number;
  height: number;
  titleH: number;
  fontPx: number;
  family: string;
  weight: number;
  humanise: HumaniseLimits;
  /** For `steps auto`: the layout's own order for nodes, arrows and marks. */
  autoSteps?: { nodes?: Map<string, number>; edges?: Map<number, number>; marks?: Map<number, number> };
  /** Nodes the layout styled itself (a mind map's levels, a timeline's events). Overrides the source. */
  defs?: Map<string, NodeDef>;
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
  if (n.def.shape === 'circle' || n.def.shape === 'cloud' || n.def.shape === 'dot' || n.def.shape === 'bullseye') {
    t = 1 / Math.sqrt((ux * ux) / (hw * hw) + (uy * uy) / (hh * hh));
  } else if (n.def.shape === 'diamond') {
    t = 1 / (Math.abs(ux) / hw + Math.abs(uy) / hh);
  } else {
    t = Math.min(ux === 0 ? Infinity : hw / Math.abs(ux), uy === 0 ? Infinity : hh / Math.abs(uy));
  }
  return [n.cx + ux * (t + gap), n.cy + uy * (t + gap)];
}


/** The bounding box of a decoration, for fitting the canvas. */
export function decorationBox(d: Decoration, font?: { family: string; weight: number }): Box | undefined {
  const fromPts = (pts: Pt[], pad = 4): Box => {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs) - pad;
    const y = Math.min(...ys) - pad;
    return { x, y, w: Math.max(...xs) - x + pad, h: Math.max(...ys) - y + pad };
  };
  switch (d.kind) {
    case 'line':
    case 'branch':
      return fromPts(d.points);
    case 'brace':
      return fromPts([d.from, d.to, d.toward]);
    case 'text': {
      if (!font) return undefined;
      const m = measure(d.text, d.px, font.family, d.bold ? Math.min(700, font.weight + 200) : font.weight);
      const x = d.anchor === 'start' ? d.x : d.x - m.w / 2;
      return { x: x - 4, y: d.y - m.h / 2 - 4, w: m.w + 8, h: m.h + 8 };
    }
    case 'box':
      return d.box;
    case 'ring':
      return { x: d.cx - d.rx - 4, y: d.cy - d.ry - 4, w: d.rx * 2 + 8, h: d.ry * 2 + 8 };
    case 'zigzag':
      return fromPts([d.at], 10);
    case 'disc':
      return { x: d.cx - d.r - 4, y: d.cy - d.r - 4, w: d.r * 2 + 8, h: d.r * 2 + 8 };
    case 'region': {
      const c = d.in[0];
      return { x: c.cx - c.r, y: c.cy - c.r, w: c.r * 2, h: c.r * 2 };
    }
  }
}

/** Moves a decoration by (dx, dy). */
export function shiftDecoration(d: Decoration, dx: number, dy: number): Decoration {
  const m = (p: Pt): Pt => [p[0] + dx, p[1] + dy];
  switch (d.kind) {
    case 'line':
    case 'branch':
      return { ...d, points: d.points.map(m) };
    case 'brace':
      return { ...d, from: m(d.from), to: m(d.to), toward: m(d.toward) };
    case 'text':
      return { ...d, x: d.x + dx, y: d.y + dy };
    case 'box':
      return { ...d, box: { ...d.box, x: d.box.x + dx, y: d.box.y + dy } };
    case 'ring':
      return { ...d, cx: d.cx + dx, cy: d.cy + dy };
    case 'zigzag':
      return { ...d, at: m(d.at) };
    case 'disc':
      return { ...d, cx: d.cx + dx, cy: d.cy + dy };
    case 'region': {
      const mc = (c: { cx: number; cy: number; r: number }) => ({ ...c, cx: c.cx + dx, cy: c.cy + dy });
      return { ...d, in: d.in.map(mc), out: d.out.map(mc) };
    }
  }
}
