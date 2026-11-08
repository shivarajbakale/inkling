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
      // A round loop over the top-right corner: out of the top, back into the right side.
      const r = Math.min(30, Math.max(18, a.h * 0.5));
      const top = a.cy - a.h / 2;
      const right = a.cx + a.w / 2;
      edge.points = [
        [right - Math.min(a.w * 0.3, 26), top - 6],
        [right + r * 0.75, top - r * 0.75],
        [right + 9, top + Math.min(a.h * 0.3, 18)],
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
      // Still through a box after one detour (long arrows in big diagrams): detour around each in turn.
      const via = blocker ? detours(scene, a, b, ctrl) : [ctrl];
      edge.points = [boundaryPoint(a, via[0][0], via[0][1]), ...via, boundaryPoint(b, via[via.length - 1][0], via[via.length - 1][1], 9)];
    } else {
      edge.points = [boundaryPoint(a, mids[0][0], mids[0][1]), ...mids, boundaryPoint(b, mids[mids.length - 1][0], mids[mids.length - 1][1], 9)];
    }
  }
}

/**
 * Waypoints from a to b that pass beside every node in the way, for an arrow
 * that one detour didn't clear. Tries three ways (all detours on one side, all
 * on the other, each on its nearer side) and keeps the one that hits fewest
 * nodes, then turns least. Falls back to the single detour if none is better.
 */
function detours(scene: Scene, a: SceneNode, b: SceneNode, first: Pt): Pt[] {
  const ux0 = b.cx - a.cx;
  const uy0 = b.cy - a.cy;
  const L = Math.hypot(ux0, uy0) || 1;
  const [ux, uy] = [ux0 / L, uy0 / L];
  const [nx, ny] = [-uy, ux];
  const ends = (via: Pt[]): Pt[] => [[a.cx, a.cy], ...via, [b.cx, b.cy]];
  const firstHit = (pts: Pt[]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      let best: SceneNode | undefined;
      let bestD = Infinity;
      for (const n of scene.nodes.values()) {
        if (n === a || n === b) continue;
        const box = { x: n.cx - n.w / 2 - 6, y: n.cy - n.h / 2 - 6, w: n.w + 12, h: n.h + 12 };
        if (!segmentHitsBox(pts[i], pts[i + 1], box)) continue;
        const d = Math.hypot(n.cx - pts[i][0], n.cy - pts[i][1]);
        if (d < bestD) [bestD, best] = [d, n];
      }
      if (best) return best;
    }
    return undefined;
  };
  const hits = (pts: Pt[]) =>
    [...scene.nodes.values()].filter((n) => {
      if (n === a || n === b) return false;
      const box = { x: n.cx - n.w / 2 - 4, y: n.cy - n.h / 2 - 4, w: n.w + 8, h: n.h + 8 };
      return pts.slice(1).some((q, i) => segmentHitsBox(pts[i], q, box));
    }).length;
  const turning = (pts: Pt[]) => {
    let t = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      let d = Math.abs(Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]) - Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]));
      if (d > Math.PI) d = 2 * Math.PI - d;
      t += d;
    }
    return t;
  };
  const along = (p: Pt) => (p[0] - a.cx) * ux + (p[1] - a.cy) * uy;
  const firstSide = (first[0] - a.cx) * nx + (first[1] - a.cy) * ny >= 0 ? 1 : -1;
  const plan = (mode: 1 | -1 | 0): Pt[] => {
    const via: Pt[] = [first];
    for (let round = 0; round < 6; round++) {
      const n = firstHit(ends(via));
      if (!n) break;
      const off = (n.cx - a.cx) * nx + (n.cy - a.cy) * ny;
      const side = mode || (off >= 0 ? -1 : 1);
      const reach = Math.abs(nx) * (n.w / 2) + Math.abs(ny) * (n.h / 2) + 26;
      // Beside the node, measured across the a → b line, so detours on one side line up.
      const t = Math.min(L - 1, Math.max(1, along([n.cx, n.cy])));
      const across = side > 0 ? off + reach : off - reach;
      via.push([a.cx + ux * t + nx * across, a.cy + uy * t + ny * across]);
      via.sort((m, k) => along(m) - along(k));
    }
    return via;
  };
  let best: Pt[] = [first];
  let bestCost = hits(ends(best)) * 1000 + turning(ends(best));
  for (const mode of [firstSide, -firstSide, 0] as (1 | -1 | 0)[]) {
    const via = plan(mode);
    const cost = hits(ends(via)) * 1000 + turning(ends(via));
    if (cost < bestCost) [bestCost, best] = [cost, via];
  }
  return best;
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
