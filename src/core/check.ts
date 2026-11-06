import { nodeBox } from './arrange';
import { overlapArea } from './labels';
import type { Box, Scene } from './scene';

export interface SceneProblem {
  kind: 'node-overlap' | 'outside' | 'label-on-node' | 'label-overlap' | 'group-intrudes';
  ids: string[];
  /** Overlap in square pixels, or distance outside in pixels. */
  amount: number;
}

/**
 * Checks a laid-out scene for things a reader would see as broken: nodes on
 * top of each other or off the canvas, labels covering nodes or each other,
 * or a group frame cutting through a node that is not in it. Used by tests
 * and by the playground's debug overlay.
 */
export function checkScene(scene: Scene, tolerance = 2): SceneProblem[] {
  const out: SceneProblem[] = [];
  const nodes = [...scene.nodes.values()];
  const area = tolerance * tolerance * 4;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const w = Math.min(a.cx + a.w / 2, b.cx + b.w / 2) - Math.max(a.cx - a.w / 2, b.cx - b.w / 2);
      const h = Math.min(a.cy + a.h / 2, b.cy + b.h / 2) - Math.max(a.cy - a.h / 2, b.cy - b.h / 2);
      if (w > tolerance && h > tolerance) out.push({ kind: 'node-overlap', ids: [a.def.id, b.def.id], amount: w * h });
    }
    const outside = Math.max(-(a.cx - a.w / 2), -(a.cy - a.h / 2), a.cx + a.w / 2 - scene.width, a.cy + a.h / 2 - scene.height);
    if (outside > tolerance) out.push({ kind: 'outside', ids: [a.def.id], amount: outside });
  }

  const labels = [...scene.labels.values()];
  for (let i = 0; i < labels.length; i++) {
    const l = labels[i];
    for (const n of nodes) {
      const o = overlapArea(l.box, nodeBox(n));
      if (o > area) out.push({ kind: 'label-on-node', ids: [l.key, n.def.id], amount: o });
    }
    for (let j = i + 1; j < labels.length; j++) {
      const o = overlapArea(l.box, labels[j].box);
      if (o > area) out.push({ kind: 'label-overlap', ids: [l.key, labels[j].key], amount: o });
    }
  }

  // A frame must not cut through nodes outside the group.
  for (const g of scene.groups) {
    const inside = (b: Box) => b.x >= g.box.x && b.y >= g.box.y && b.x + b.w <= g.box.x + g.box.w && b.y + b.h <= g.box.y + g.box.h;
    for (const n of nodes) {
      if (isIn(scene, n.def.group, g.def.id)) continue;
      const b = nodeBox(n);
      const o = overlapArea(b, g.box);
      if (o > area && !inside(b)) out.push({ kind: 'group-intrudes', ids: [g.def.id, n.def.id], amount: o });
      if (inside(b)) out.push({ kind: 'group-intrudes', ids: [g.def.id, n.def.id], amount: b.w * b.h });
    }
  }
  return out;
}

/** Is group `inner` the same as, or nested in, group `outer`? */
function isIn(scene: Scene, inner: string | undefined, outer: string): boolean {
  let cur = inner;
  while (cur) {
    if (cur === outer) return true;
    cur = scene.groups.find((g) => g.def.id === cur)?.def.parent;
  }
  return false;
}
