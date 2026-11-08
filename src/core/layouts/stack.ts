import type { LayoutFn, Pt } from '../scene';
import type { NodeDef } from '../types';
import { emptyScene, fitScene, inOrder, placeNode, sizeDef, textMetrics } from './shared';

/**
 * Layers stacked top to bottom (or left to right with `layout stack` +
 * `direction right`). Top-level bullets, or nodes in source order, are the
 * layers; child bullets sit side by side inside their layer.
 */
export const stack: LayoutFn = (doc) => {
  const scene = emptyScene(doc, 'stack', { tilt: 0.8, stickyTilt: 4, jitterX: 3, jitterY: 0 });
  const across = doc.direction === 'right' && doc.directionSet === true;
  const all = inOrder(doc);
  // Everything under a layer, at any depth, sits in that layer's row.
  const childrenOf = (id: string): NodeDef[] => all.filter((n) => n.bullet?.parent === id).flatMap((c) => [c, ...childrenOf(c.id)]);
  const layers = all.filter((n) => !n.bullet || n.bullet.level === 0);
  const gap = doc.gap ?? 0;
  const { px } = textMetrics(doc);
  const pad = 22;

  // Sizes: a layer is as wide as its label or its children, whichever is wider.
  const box = (def: NodeDef): NodeDef => (def.shape === 'box' || def.implicit ? { ...def, shape: 'box' } : def);
  const plan = layers.map((def) => {
    const own = sizeDef(doc, box(def));
    const kids = childrenOf(def.id).map((c) => ({ def: box(c), size: sizeDef(doc, box(c)) }));
    const kidsW = kids.reduce((s, k) => s + k.size.w, 0) + Math.max(0, kids.length - 1) * 14;
    const kidsH = Math.max(0, ...kids.map((k) => k.size.h));
    const w = Math.max(own.w, kidsW + pad * 2);
    const h = kids.length ? own.lh + kidsH + pad * 1.6 + 10 : own.h + 8;
    return { def: box(def), own, kids, w, h, kidsH };
  });
  const layerW = Math.max(0, ...plan.map((p) => p.w));
  const layerH = Math.max(0, ...plan.map((p) => p.h));

  let cursor = 40;
  const centres = new Map<string, Pt>();
  for (const p of plan) {
    const w = across ? p.w : layerW;
    const h = across ? layerH : p.h;
    const cx = across ? cursor + w / 2 : 60 + layerW / 2;
    const cy = across ? 40 + layerH / 2 : cursor + h / 2;
    const labelDy = p.kids.length ? -h / 2 + p.own.lh / 2 + 10 : 0;
    placeNode(scene, doc, p.def, cx, cy, { w, h, labelDy });
    centres.set(p.def.id, [cx, cy]);
    // Children in a row inside the layer, below its name.
    if (p.kids.length) {
      const total = p.kids.reduce((s, k) => s + k.size.w, 0) + (p.kids.length - 1) * 14;
      let x = cx - total / 2;
      const y = cy - h / 2 + p.own.lh + 14 + p.kidsH / 2 + 4;
      for (const k of p.kids) {
        placeNode(scene, doc, k.def, x + k.size.w / 2, y);
        x += k.size.w + 14;
      }
    }
    cursor += (across ? w : h) + gap;
  }

  // Braces: a curly bracket beside a run of layers, with its label.
  const right = 60 + layerW;
  for (const r of doc.ranges) {
    const a = scene.nodes.get(r.from);
    const b = scene.nodes.get(r.to);
    if (!a || !b) continue;
    if (across) {
      const y = 40 + layerH + 14;
      const x1 = Math.min(a.cx - a.w / 2, b.cx - b.w / 2) + 4;
      const x2 = Math.max(a.cx + a.w / 2, b.cx + b.w / 2) - 4;
      scene.decorations.push({ kind: 'brace', from: [x1, y], to: [x2, y], toward: [(x1 + x2) / 2, y + 30], owner: { node: r.to } });
      if (r.label) scene.decorations.push({ kind: 'text', x: (x1 + x2) / 2, y: y + 34, text: r.label, px: px * 0.9, owner: { node: r.to } });
    } else {
      const y1 = Math.min(a.cy - a.h / 2, b.cy - b.h / 2) + 4;
      const y2 = Math.max(a.cy + a.h / 2, b.cy + b.h / 2) - 4;
      const x = right + 14;
      scene.decorations.push({ kind: 'brace', from: [x, y1], to: [x, y2], toward: [x + 30, (y1 + y2) / 2], owner: { node: r.to } });
      if (r.label) scene.decorations.push({ kind: 'text', x: x + 30, y: (y1 + y2) / 2, text: r.label, px: px * 0.9, anchor: 'start', owner: { node: r.to } });
    }
  }

  // Arrows between layers run down the left edge so they never cross labels.
  scene.edges.forEach((e, i) => {
    const a = scene.nodes.get(e.def.from);
    const b = scene.nodes.get(e.def.to);
    if (!a || !b || !centres.has(e.def.from) || !centres.has(e.def.to) || across) return;
    const lane = 60 - 18 - (i % 3) * 10;
    e.points = [
      [a.cx - a.w / 2 - 4, a.cy],
      [lane, a.cy],
      [lane, b.cy],
      [b.cx - b.w / 2 - 8, b.cy],
    ];
    e.fixed = true;
    e.bend = -20;
  });

  scene.autoSteps = { nodes: new Map() };
  layers.forEach((l, k) => {
    scene.autoSteps!.nodes!.set(l.id, k + 1);
    for (const c of childrenOf(l.id)) scene.autoSteps!.nodes!.set(c.id, k + 1);
  });
  fitScene(scene);
  return scene;
};

