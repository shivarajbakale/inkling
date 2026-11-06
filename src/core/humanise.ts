import { boundaryPoint, type Pt, type Scene } from './scene';
import type { Doc } from './types';

/**
 * Nudges and tilts nodes so the drawing does not look machine-placed. How far
 * depends on the mess setting and on the layout's own limits.
 */
export function humanise(scene: Scene, doc: Doc, rand: () => number) {
  const jitter = doc.mess;
  const lim = scene.humanise;
  for (const def of doc.nodes) {
    const n = scene.nodes.get(def.id);
    if (!n) continue;
    n.rotate = def.shape === 'sticky' ? (rand() - 0.5) * lim.stickyTilt : (rand() - 0.5) * lim.tilt * jitter;
    n.cx += (rand() - 0.5) * lim.jitterX * jitter;
    n.cy += (rand() - 0.5) * lim.jitterY * jitter;
  }
}

/**
 * Turns each edge's route into its final line: ends trimmed to the shapes,
 * a gentle bow on direct lines, and parallel arrows fanned apart.
 */
export function routeEdges(scene: Scene, doc: Doc, rand: () => number) {
  const pairCount = new Map<string, number>();
  const pairSeen = new Map<string, number>();
  const pairKey = (x: string, y: string) => (x < y ? `${x}\u0000${y}` : `${y}\u0000${x}`);
  for (const e of scene.edges) pairCount.set(pairKey(e.def.from, e.def.to), (pairCount.get(pairKey(e.def.from, e.def.to)) ?? 0) + 1);

  for (const edge of scene.edges) {
    const e = edge.def;
    const a = scene.nodes.get(e.from)!;
    const b = scene.nodes.get(e.to)!;
    const mids = edge.route;
    if (e.from === e.to) {
      const r = Math.max(a.w, a.h) * 0.45;
      edge.points = [
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
        edge.bend = (k - (n - 1) / 2) * 40 * sign;
      } else {
        edge.bend = (rand() - 0.5) * len * 0.08 * (0.4 + doc.mess);
      }
      const ux = (b.cx - a.cx) / len;
      const uy = (b.cy - a.cy) / len;
      const ctrl: Pt = [(a.cx + b.cx) / 2 - uy * edge.bend, (a.cy + b.cy) / 2 + ux * edge.bend];
      edge.points = [boundaryPoint(a, ctrl[0], ctrl[1]), ctrl, boundaryPoint(b, ctrl[0], ctrl[1], 9)];
    } else {
      edge.points = [boundaryPoint(a, mids[0][0], mids[0][1]), ...mids, boundaryPoint(b, mids[mids.length - 1][0], mids[mids.length - 1][1], 9)];
    }
  }
}
