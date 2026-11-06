import type { LayoutFn } from '../scene';
import { emptyScene, fitScene, placeNode, sizeDef, warn } from './shared';

/**
 * Free placement: `at x,y` for exact centres, or `below`, `above`,
 * `left of`, `right of` another node. The author decides; the humaniser only
 * tilts, never moves.
 */
export const free: LayoutFn = (doc) => {
  const scene = emptyScene(doc, 'free', { tilt: 2.5, stickyTilt: 6, jitterX: 0, jitterY: 0 });
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const pos = new Map<string, [number, number]>();
  const resolving = new Set<string>();
  const loops = new Set<string>();

  const resolve = (id: string): [number, number] | undefined => {
    const hit = pos.get(id);
    if (hit) return hit;
    const def = byId.get(id);
    if (!def) return undefined;
    if (def.at) {
      pos.set(id, def.at);
      return def.at;
    }
    if (!def.near) return undefined;
    if (resolving.has(id)) {
      loops.add(id);
      return undefined;
    }
    resolving.add(id);
    const anchor = resolve(def.near.of);
    resolving.delete(id);
    if (!anchor) return undefined;
    const a = sizeDef(doc, byId.get(def.near.of)!);
    const me = sizeDef(doc, def);
    const gap = def.near.gap ?? 60;
    const [x, y] = anchor;
    const p: [number, number] =
      def.near.side === 'below'
        ? [x, y + a.h / 2 + gap + me.h / 2]
        : def.near.side === 'above'
          ? [x, y - a.h / 2 - gap - me.h / 2]
          : def.near.side === 'right'
            ? [x + a.w / 2 + gap + me.w / 2, y]
            : [x - a.w / 2 - gap - me.w / 2, y];
    pos.set(id, p);
    return p;
  };

  const unplaced: string[] = [];
  for (const def of doc.nodes) {
    const p = resolve(def.id);
    if (p) placeNode(scene, doc, def, p[0], p[1]);
    else unplaced.push(def.id);
  }
  if (loops.size) warn(scene, 'W-PLACE-LOOP', `These nodes are placed relative to each other in a loop: ${[...loops].join(', ')}.`, 'Give one of them an  at x,y  position.');

  // Anything without a position goes in a row underneath, so nothing is lost.
  if (unplaced.length) {
    if (doc.nodes.some((n) => n.at || n.near)) warn(scene, 'W-UNPLACED', `No position for ${unplaced.join(', ')}; they are drawn in a row underneath.`, 'Add  at x,y  or  below other.');
    let bottom = 0;
    for (const n of scene.nodes.values()) bottom = Math.max(bottom, n.cy + n.h / 2);
    let x = 40;
    const sizes = unplaced.map((id) => sizeDef(doc, byId.get(id)!));
    const rowH = Math.max(...sizes.map((s) => s.h));
    unplaced.forEach((id, k) => {
      const s = sizes[k];
      placeNode(scene, doc, byId.get(id)!, x + s.w / 2, bottom + 60 + rowH / 2);
      x += s.w + 50;
    });
  }
  fitScene(scene);
  return scene;
};
