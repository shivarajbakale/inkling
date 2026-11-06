import { measure } from '../measure';
import type { LayoutFn, Pt } from '../scene';
import { emptyScene, fitScene, inOrder, placeNode, sizeDef, textMetrics, warn } from './shared';

/**
 * Nodes evenly around a circle, from 12 o'clock, clockwise unless the cycle
 * says counterclockwise. Arrows follow the circle. `center "text"` sits in
 * the middle.
 */
export const cycle: LayoutFn = (doc) => {
  const scene = emptyScene(doc, 'cycle', { tilt: 2.4, stickyTilt: 6, jitterX: 4, jitterY: 4 });
  const { px, family, weight } = textMetrics(doc);
  const ids = doc.cycle?.ids ?? inOrder(doc).map((n) => n.id);
  const ring = ids.map((id) => doc.nodes.find((n) => n.id === id)!).filter(Boolean);
  if (!doc.cycle) warn(scene, 'W-NO-CYCLE', 'No  cycle a, b, c  line, so nodes go round in the order they were written.', 'Add a cycle line to choose the order and draw the arrows.');
  const dir = doc.cycle?.counterclockwise ? -1 : 1;
  const sizes = ring.map((d) => sizeDef(doc, d));

  // Radius: room for every node plus 40px between neighbours, and room for the centre text.
  const centreText = doc.center ? measure(doc.center, px * 1.15, family, Math.min(700, weight + 200)) : { w: 0, h: 0 };
  const perimeter = sizes.reduce((s, z) => s + Math.hypot(z.w, z.h) * 0.85 + 40, 0);
  let r = Math.max(perimeter / (2 * Math.PI), 110, centreText.w / 2 + Math.max(...sizes.map((z) => z.w), 0) / 2 + 50);
  // Grow the circle until no two boxes come within 24px of each other.
  const angle0 = (k: number) => -Math.PI / 2 + ((2 * Math.PI * k) / Math.max(1, ring.length));
  const clashes = (radius: number) =>
    sizes.some((a, i) =>
      sizes.some((b, j) => {
        if (j <= i) return false;
        const dx = Math.abs(Math.cos(angle0(i)) - Math.cos(angle0(j))) * radius;
        const dy = Math.abs(Math.sin(angle0(i)) - Math.sin(angle0(j))) * radius;
        return dx < (a.w + b.w) / 2 + 24 && dy < (a.h + b.h) / 2 + 24;
      }),
    );
  for (let k = 0; k < 40 && clashes(r); k++) r *= 1.08;
  const maxW = Math.max(0, ...sizes.map((z) => z.w));
  const maxH = Math.max(0, ...sizes.map((z) => z.h));
  const cx = 40 + r + maxW / 2 + 40;
  const cy = 40 + r + maxH / 2 + 20;
  const angleOf = (k: number) => -Math.PI / 2 + dir * ((2 * Math.PI * k) / ring.length);

  ring.forEach((def, k) => {
    const a = angleOf(k);
    placeNode(scene, doc, def, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  });

  // Nodes not in the cycle sit in a row under it.
  const rest = inOrder(doc).filter((n) => !ids.includes(n.id));
  let x = 40;
  for (const def of rest) {
    const s = sizeDef(doc, def);
    placeNode(scene, doc, def, x + s.w / 2, cy + r + maxH / 2 + 70);
    x += s.w + 40;
  }

  // Arrows between neighbours follow the circle, trimmed at each node.
  const pos = new Map(ring.map((d, k) => [d.id, k]));
  scene.edges.forEach((e) => {
    const ka = pos.get(e.def.from);
    const kb = pos.get(e.def.to);
    if (ka === undefined || kb === undefined) return;
    const next = (ka + 1) % ring.length;
    if (kb !== next) return;
    const a0 = angleOf(ka);
    const a1 = angleOf(ka) + dir * ((2 * Math.PI) / ring.length);
    // Walk along the circle from a node's centre until the point leaves its box.
    const leave = (k: number, from: number, step: number) => {
      const n = scene.nodes.get(ring[k].id)!;
      let t = from;
      for (let i = 0; i < 400; i++) {
        const x = cx + Math.cos(t) * r;
        const y = cy + Math.sin(t) * r;
        if (Math.abs(x - n.cx) > n.w / 2 + 9 || Math.abs(y - n.cy) > n.h / 2 + 9) break;
        t += step;
      }
      return t;
    };
    const s0 = leave(ka, a0, dir * 0.005);
    const s1 = leave(kb, a1, -dir * 0.005);
    if ((s1 - s0) * dir <= 0.05) return;
    const pts: Pt[] = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const t = s0 + ((s1 - s0) * i) / n;
      pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
    e.points = pts;
    e.fixed = true;
    // Labels go outside the circle.
    const mid = pts[Math.floor(n / 2)];
    const d = [pts[n / 2 + 1][0] - pts[n / 2 - 1][0], pts[n / 2 + 1][1] - pts[n / 2 - 1][1]];
    const outward = (-d[1] * (mid[0] - cx) + d[0] * (mid[1] - cy)) > 0 ? 1 : -1;
    e.bend = 30 * outward;
  });

  if (doc.center) scene.decorations.push({ kind: 'text', x: cx, y: cy, text: doc.center, px: px * 1.15, bold: true });

  scene.autoSteps = { nodes: new Map(ring.map((d, k) => [d.id, k + 1])) };
  rest.forEach((d) => scene.autoSteps!.nodes!.set(d.id, ring.length + 1));
  fitScene(scene);
  return scene;
};
