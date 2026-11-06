import { boundaryPoint, type Pt, type Scene, type SceneNode } from './scene';
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
    if (edge.fixed) continue;
    const e = edge.def;
    const a = scene.nodes.get(e.from);
    const b = scene.nodes.get(e.to);
    // A layout may leave a node out (it has no place in that layout); so is its arrow.
    if (!a || !b) {
      edge.style = 'hidden';
      continue;
    }
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
        const labelled = scene.edges.some((o) => o.def.label && pairKey(o.def.from, o.def.to) === key);
        edge.bend = (k - (n - 1) / 2) * (labelled ? 56 : 40) * sign;
      } else {
        edge.bend = (rand() - 0.5) * len * 0.08 * (0.4 + doc.mess);
      }
      const ux = (b.cx - a.cx) / len;
      const uy = (b.cy - a.cy) / len;
      let ctrl: Pt = [(a.cx + b.cx) / 2 - uy * edge.bend, (a.cy + b.cy) / 2 + ux * edge.bend];
      // A single arrow that would cut through another node goes around it.
      const blocker = n === 1 ? firstBlocker(scene, a, b, ctrl) : undefined;
      if (blocker) {
        const nx = -uy;
        const ny = ux;
        const side = (blocker.cx - a.cx) * nx + (blocker.cy - a.cy) * ny > 0 ? -1 : 1;
        const reach = Math.abs(nx) * (blocker.w / 2) + Math.abs(ny) * (blocker.h / 2) + 26;
        ctrl = [blocker.cx + nx * side * reach, blocker.cy + ny * side * reach];
        edge.bend = ((ctrl[0] - (a.cx + b.cx) / 2) * nx + (ctrl[1] - (a.cy + b.cy) / 2) * ny) || side;
      }
      edge.points = [boundaryPoint(a, ctrl[0], ctrl[1]), ctrl, boundaryPoint(b, ctrl[0], ctrl[1], 9)];
    } else {
      edge.points = [boundaryPoint(a, mids[0][0], mids[0][1]), ...mids, boundaryPoint(b, mids[mids.length - 1][0], mids[mids.length - 1][1], 9)];
    }
  }
}

/** The node nearest to `a` that the line a → ctrl → b passes through, if any. */
function firstBlocker(scene: Scene, a: SceneNode, b: SceneNode, ctrl: Pt): SceneNode | undefined {
  const segs: [Pt, Pt][] = [
    [[a.cx, a.cy], ctrl],
    [ctrl, [b.cx, b.cy]],
  ];
  let best: SceneNode | undefined;
  let bestD = Infinity;
  for (const n of scene.nodes.values()) {
    if (n === a || n === b) continue;
    const pad = 6;
    const box = { x: n.cx - n.w / 2 - pad, y: n.cy - n.h / 2 - pad, w: n.w + pad * 2, h: n.h + pad * 2 };
    if (segs.some(([p, q]) => segmentHitsBox(p, q, box))) {
      const d = Math.hypot(n.cx - a.cx, n.cy - a.cy);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
  }
  return best;
}

/** Liang–Barsky clipping: does segment p→q cross the box? */
export function segmentHitsBox(p: Pt, q: Pt, box: { x: number; y: number; w: number; h: number }): boolean {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, p[0] - box.x],
    [dx, box.x + box.w - p[0]],
    [-dy, p[1] - box.y],
    [dy, box.y + box.h - p[1]],
  ];
  for (const [pp, qq] of edges) {
    if (pp === 0) {
      if (qq < 0) return false;
    } else {
      const r = qq / pp;
      if (pp < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
      if (t0 > t1) return false;
    }
  }
  return true;
}
