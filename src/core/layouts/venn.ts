import type { Box, LayoutFn, Pt, Scene } from '../scene';
import type { Doc, NodeDef } from '../types';
import { emptyScene, fitScene, inOrder, placeNode, sizeDef, warn } from './shared';

interface Circle {
  cx: number;
  cy: number;
  r: number;
}

const INKS = ['blue', 'orange', 'green'];
const FILLS = ['blue', 'orange', 'green'];

/** Which circles a point is in, as a bit mask. */
const membership = (p: Pt, cs: Circle[]) => cs.reduce((m, c, k) => (Math.hypot(p[0] - c.cx, p[1] - c.cy) < c.r ? m | (1 << k) : m), 0);

/** How far a point is from the nearest circle edge. */
const clearance = (p: Pt, cs: Circle[]) => Math.min(...cs.map((c) => Math.abs(Math.hypot(p[0] - c.cx, p[1] - c.cy) - c.r)));

/** Circles for two or three sets with radius r, centres a radius apart. */
function arrange(n: number, r: number): Circle[] {
  const d = r * (n === 3 ? 1.05 : 1.1);
  if (n === 1) return [{ cx: r, cy: r, r }];
  if (n === 2)
    return [
      { cx: r, cy: r, r },
      { cx: r + d, cy: r, r },
    ];
  return [
    { cx: r, cy: r, r },
    { cx: r + d, cy: r, r },
    { cx: r + d / 2, cy: r + d * 0.866, r },
  ];
}

/** Is a w×h box centred on p wholly inside region `mask`? */
function fits(p: Pt, w: number, h: number, mask: number, cs: Circle[]): boolean {
  for (const fx of [-0.5, -0.25, 0, 0.25, 0.5])
    for (const fy of [-0.5, 0, 0.5]) if (membership([p[0] + fx * w, p[1] + fy * h], cs) !== mask) return false;
  return true;
}

/** The point in a region farthest from any circle edge, found on a grid. */
function pole(mask: number, cs: Circle[]): Pt | undefined {
  const minX = Math.min(...cs.map((c) => c.cx - c.r));
  const maxX = Math.max(...cs.map((c) => c.cx + c.r));
  const minY = Math.min(...cs.map((c) => c.cy - c.r));
  const maxY = Math.max(...cs.map((c) => c.cy + c.r));
  const step = (maxX - minX) / 60;
  let best: Pt | undefined;
  let bestC = -1;
  for (let x = minX; x <= maxX; x += step)
    for (let y = minY; y <= maxY; y += step) {
      if (membership([x, y], cs) !== mask) continue;
      const c = clearance([x, y], cs);
      if (c > bestC + 0.01) {
        bestC = c;
        best = [x, y];
      }
    }
  return best;
}

/**
 * Overlapping sets. `set a "Label"` declares a circle (two or three of them);
 * items say where they belong with `in a & b`. Items with no `in` sit outside
 * every circle. The radius grows until every region holds its items.
 */
export const venn: LayoutFn = (doc) => {
  const scene = emptyScene(doc, 'venn', { tilt: 0.8, stickyTilt: 3, jitterX: 0, jitterY: 0 });
  const sets = doc.sets;
  if (sets.length < 2) {
    warn(scene, 'W-VENN-SETS', sets.length ? 'A venn diagram needs at least two sets.' : 'This venn diagram has no sets.', 'Add  set a "A"  and  set b "B"');
  }
  const n = Math.max(1, Math.min(3, sets.length));
  const setNodes = sets.map((id) => doc.nodes.find((d) => d.id === id)!);
  const items = inOrder(doc).filter((d) => d.role !== 'set');
  const maskOf = (d: NodeDef) => (d.inside ?? []).reduce((m, id) => (sets.indexOf(id) >= 0 && sets.indexOf(id) < 3 ? m | (1 << sets.indexOf(id)) : m), 0);

  // Items grouped by region, each region's text block stacked.
  const styled = new Map(items.map((d) => [d.id, { ...d, shape: 'text' as const }]));
  const size = new Map(items.map((d) => [d.id, sizeDef(doc, styled.get(d.id)!)]));
  const byMask = new Map<number, NodeDef[]>();
  for (const d of items) byMask.set(maskOf(d), [...(byMask.get(maskOf(d)) ?? []), d]);
  const block = (mask: number) => {
    const list = byMask.get(mask) ?? [];
    return { w: Math.max(54, ...list.map((d) => size.get(d.id)!.w)), h: Math.max(30, list.reduce((t, d) => t + size.get(d.id)!.h, 0)) };
  };
  const masks = Array.from({ length: (1 << n) - 1 }, (_, k) => k + 1);

  // Grow the radius until every region's block fits at its pole.
  let r = 110;
  let circles = arrange(n, r);
  let poles = new Map<number, Pt>();
  for (let tries = 0; tries < 16; tries++) {
    circles = arrange(n, r);
    poles = new Map(masks.map((m) => [m, pole(m, circles)!]));
    if (masks.every((m) => poles.get(m) && fits(poles.get(m)!, block(m).w + 8, block(m).h + 6, m, circles))) break;
    if (tries === 15) warn(scene, 'W-VENN-CROWDED', 'Some regions are too full for their items to fit inside.', 'Shorten the items, or move some out.');
    r *= 1.12;
  }

  // Leave room on the left and top for the set names.
  const nameSize = setNodes.map((d) => sizeDef(doc, { ...d, size: 'large' }));
  const ox = 40 + Math.max(0, ...nameSize.map((s) => s.w)) * 0.5;
  const oy = 40 + Math.max(0, ...nameSize.map((s) => s.h)) + 10;
  circles = circles.map((c) => ({ ...c, cx: c.cx + ox, cy: c.cy + oy }));
  for (const [m, p] of poles) poles.set(m, [p[0] + ox, p[1] + oy]);
  const mid: Pt = [circles.reduce((t, c) => t + c.cx, 0) / circles.length, circles.reduce((t, c) => t + c.cy, 0) / circles.length];

  // Circles, then their names outside, on the side away from the others.
  const step = new Map<string, number>();
  circles.forEach((c, k) => {
    const id = sets[k];
    if (!id) return;
    const def = setNodes[k];
    const color = def.color ?? INKS[k];
    scene.decorations.push({ kind: 'disc', cx: c.cx, cy: c.cy, r: c.r, color, fill: def.fill ?? FILLS[k], owner: { node: id } });
    let dx = c.cx - mid[0];
    let dy = c.cy - mid[1] - (n === 2 ? c.r * 0.9 : 0);
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const s = nameSize[k];
    const at: Pt = [c.cx + dx * (c.r + 6), c.cy + dy * (c.r + 6)];
    placeNode(scene, doc, { ...def, color, size: 'large' }, at[0] + (dx * s.w) / 2, at[1] + (dy * s.h) / 2, s);
    step.set(id, 1);
  });

  // Items stacked at their region's pole; outside items in a column to the right.
  const right = Math.max(...circles.map((c) => c.cx + c.r));
  for (const [mask, list] of byMask) {
    const b = block(mask);
    const p: Pt = mask === 0 ? [right + 40 + b.w / 2, Math.max(...circles.map((c) => c.cy + c.r)) - b.h / 2] : poles.get(mask) ?? mid;
    let y = p[1] - b.h / 2;
    for (const d of list) {
      const s = size.get(d.id)!;
      placeNode(scene, doc, styled.get(d.id)!, p[0], y + s.h / 2, s);
      y += s.h;
    }
  }
  if (byMask.has(0)) {
    // A frame round everything: the world outside the sets.
    const all = [...scene.nodes.values()];
    const fx = Math.min(...circles.map((c) => c.cx - c.r), ...all.map((x) => x.cx - x.w / 2)) - 20;
    const fy = Math.min(...circles.map((c) => c.cy - c.r), ...all.map((x) => x.cy - x.h / 2)) - 16;
    const fr = Math.max(...circles.map((c) => c.cx + c.r), ...all.map((x) => x.cx + x.w / 2)) + 20;
    const fb = Math.max(...circles.map((c) => c.cy + c.r), ...all.map((x) => x.cy + x.h / 2)) + 16;
    scene.decorations.unshift({ kind: 'box', box: { x: fx, y: fy, w: fr - fx, h: fb - fy }, frame: true });
  }

  // Steps: each circle with its own items, then overlaps, largest first.
  const order = [...masks].sort((a, b) => bits(a) - bits(b) || (byMask.get(b)?.length ?? 0) - (byMask.get(a)?.length ?? 0) || a - b);
  const stepOfMask = new Map<number, number>();
  order.forEach((m) => {
    if (bits(m) === 1) stepOfMask.set(m, Math.log2(m) + 1);
  });
  let next = n + 1;
  for (const m of order) if (!stepOfMask.has(m)) stepOfMask.set(m, next++);
  stepOfMask.set(0, next);
  sets.forEach((id, k) => step.set(id, k + 1));
  for (const d of items) step.set(d.id, stepOfMask.get(maskOf(d)) ?? next);
  scene.autoSteps = { nodes: step };

  regionMarks(doc, scene, circles, poles, stepOfMask, byMask);
  fitScene(scene);
  return scene;
};

const bits = (m: number) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);

/** `highlight a&b` hatches that overlap; `circle a&b` rings it. */
function regionMarks(doc: Doc, scene: Scene, circles: Circle[], poles: Map<number, Pt>, stepOfMask: Map<number, number>, byMask: Map<number, NodeDef[]>) {
  doc.annotations.forEach((a) => {
    if (a.targetKind !== 'region') return;
    const mask = a.target.split('&').reduce((m, id) => m | (1 << doc.sets.indexOf(id)), 0);
    const p = poles.get(mask);
    if (!p) return;
    const owner = { step: a.at ?? stepOfMask.get(mask) };
    if (a.kind === 'highlight') {
      scene.decorations.push({
        kind: 'region',
        in: circles.filter((_, k) => mask & (1 << k)),
        out: circles.filter((_, k) => !(mask & (1 << k))),
        fill: a.color ?? 'yellow',
        owner,
      });
    } else if (a.kind === 'circle') {
      const items = (byMask.get(mask) ?? []).map((d) => scene.nodes.get(d.id)!).filter(Boolean);
      const box: Box = items.length
        ? {
            x: Math.min(...items.map((x) => x.cx - x.w / 2)),
            y: Math.min(...items.map((x) => x.cy - x.h / 2)),
            w: 0,
            h: 0,
          }
        : { x: p[0] - 30, y: p[1] - 20, w: 60, h: 40 };
      if (items.length) {
        box.w = Math.max(...items.map((x) => x.cx + x.w / 2)) - box.x;
        box.h = Math.max(...items.map((x) => x.cy + x.h / 2)) - box.y;
      }
      scene.decorations.push({ kind: 'ring', cx: box.x + box.w / 2, cy: box.y + box.h / 2, rx: box.w / 2 + 16, ry: box.h / 2 + 12, color: 'mark', owner });
    }
  });
}
