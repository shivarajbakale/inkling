import type { Scene } from './scene';

export interface SceneProblem {
  kind: 'node-overlap' | 'outside';
  ids: string[];
  /** Overlap in square pixels, or distance outside in pixels. */
  amount: number;
}

/**
 * Checks a laid-out scene for things a reader would see as broken: nodes on
 * top of each other, or nodes off the canvas. Used by tests and by the
 * playground's debug overlay.
 */
export function checkScene(scene: Scene, tolerance = 2): SceneProblem[] {
  const out: SceneProblem[] = [];
  const nodes = [...scene.nodes.values()];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const w = Math.min(a.cx + a.w / 2, b.cx + b.w / 2) - Math.max(a.cx - a.w / 2, b.cx - b.w / 2);
      const h = Math.min(a.cy + a.h / 2, b.cy + b.h / 2) - Math.max(a.cy - a.h / 2, b.cy - b.h / 2);
      if (w > tolerance && h > tolerance) out.push({ kind: 'node-overlap', ids: [a.def.id, b.def.id], amount: w * h });
    }
    const outside = Math.max(
      -(a.cx - a.w / 2),
      -(a.cy - a.h / 2),
      a.cx + a.w / 2 - scene.width,
      a.cy + a.h / 2 - scene.height,
    );
    if (outside > tolerance) out.push({ kind: 'outside', ids: [a.def.id], amount: outside });
  }
  return out;
}
