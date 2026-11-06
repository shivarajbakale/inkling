import type { LayoutFn, Pt } from '../scene';
import { INKS } from '../styles';
import type { NodeDef } from '../types';
import { emptyScene, fitScene, inOrder, placeNode, sizeDef, warn } from './shared';

/**
 * One idea branching out. The tree comes from outline bullets, or from
 * arrows (`root x` picks the centre). The root is a cloud, first-level ideas
 * are round boxes, deeper ones are underlined text. Branches are tapered
 * curves, split between the left and right sides; `direction down` grows an
 * org-chart-style tree instead.
 */
export const mindmap: LayoutFn = (doc) => {
  const scene = emptyScene(doc, 'mindmap', { tilt: 1.5, stickyTilt: 4, jitterX: 0, jitterY: 0 });
  const nodes = inOrder(doc);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Build the tree: bullets first, otherwise arrows.
  const parentOf = new Map<string, string>();
  const fromBullets = nodes.some((n) => n.bullet);
  if (fromBullets) {
    for (const n of nodes) if (n.bullet?.parent) parentOf.set(n.id, n.bullet.parent);
  } else {
    for (const e of doc.edges) if (!parentOf.has(e.to) && e.to !== e.from) parentOf.set(e.to, e.from);
  }
  // Arrows are drawn as branches instead.
  for (const e of scene.edges) if (parentOf.get(e.def.to) === e.def.from) e.style = 'hidden';

  const tops = nodes.filter((n) => !parentOf.has(n.id));
  const root = doc.root ? byId.get(doc.root) : tops[0];
  if (!root) {
    fitScene(scene);
    return scene;
  }
  if (doc.root && parentOf.has(doc.root)) parentOf.delete(doc.root);
  // Every other top-level node hangs off the root, so nothing floats free.
  for (const t of tops) if (t.id !== root.id) parentOf.set(t.id, root.id);
  if (tops.length > 1 && fromBullets) warn(scene, 'W-MANY-ROOTS', `The mind map has ${tops.length} top-level bullets; the first is the centre and the rest hang off it.`, 'Indent them under one bullet.');
  const children = (id: string) => nodes.filter((n) => parentOf.get(n.id) === id);

  // Styles by level and branch colour.
  const palette = ['blue', 'green', 'orange', 'purple', 'pink', 'red'];
  const levelOf = new Map<string, number>([[root.id, 0]]);
  const branchColor = new Map<string, string | undefined>();
  const visit = (id: string, level: number, color: string | undefined) => {
    for (const [k, c] of children(id).entries()) {
      const col = level === 0 ? (doc.colors ? palette[k % palette.length] : undefined) : color;
      levelOf.set(c.id, level + 1);
      branchColor.set(c.id, col);
      visit(c.id, level + 1, col);
    }
  };
  visit(root.id, 0, undefined);
  const styled = (d: NodeDef): NodeDef => {
    const level = levelOf.get(d.id) ?? 1;
    const explicit = !d.implicit && !d.bullet && d.shape !== 'box';
    const shape = explicit ? d.shape : level === 0 ? 'cloud' : level === 1 ? 'round' : 'text';
    const color = d.color ?? branchColor.get(d.id);
    return { ...d, shape, color, size: d.size ?? (level === 0 ? 'large' : undefined) };
  };
  const defs = new Map(nodes.filter((n) => levelOf.has(n.id)).map((n) => [n.id, styled(n)]));
  const size = new Map([...defs].map(([id, d]) => [id, sizeDef(doc, d)]));

  const down = doc.direction === 'down' && doc.directionSet === true;
  const gapAcross = 16; // between siblings
  const gapDeep = down ? 70 : 64; // between levels

  // Subtree extent along the sibling axis.
  const extentMemo = new Map<string, number>();
  const extent = (id: string): number => {
    const hit = extentMemo.get(id);
    if (hit !== undefined) return hit;
    const s = size.get(id)!;
    const own = down ? s.w : s.h;
    const kids = children(id);
    const sum = kids.reduce((t, c) => t + extent(c.id), 0) + Math.max(0, kids.length - 1) * gapAcross;
    const v = Math.max(own, sum);
    extentMemo.set(id, v);
    return v;
  };

  const centre = new Map<string, Pt>();
  // Places the children of `id` on one side (sign: +1 right/down, -1 left).
  const placeKids = (id: string, kids: NodeDef[], sign: number) => {
    const [px0, py0] = centre.get(id)!;
    const ps = size.get(id)!;
    const total = kids.reduce((t, c) => t + extent(c.id), 0) + Math.max(0, kids.length - 1) * gapAcross;
    let cursor = (down ? px0 : py0) - total / 2;
    for (const c of kids) {
      const cs = size.get(c.id)!;
      const e = extent(c.id);
      const across = cursor + e / 2;
      const deep = down ? py0 + ps.h / 2 + gapDeep + cs.h / 2 : px0 + sign * (ps.w / 2 + gapDeep + cs.w / 2);
      centre.set(c.id, down ? [across, deep] : [deep, across]);
      cursor += e + gapAcross;
      placeKids(c.id, children(c.id), sign);
    }
  };

  centre.set(root.id, [0, 0]);
  const first = children(root.id);
  if (down) placeKids(root.id, first, 1);
  else {
    // Balance the first-level branches between the two sides by subtree size.
    const right: NodeDef[] = [];
    const left: NodeDef[] = [];
    let rw = 0;
    let lw = 0;
    for (const c of first) {
      if (rw <= lw) {
        right.push(c);
        rw += extent(c.id);
      } else {
        left.push(c);
        lw += extent(c.id);
      }
    }
    placeKids(root.id, right, 1);
    placeKids(root.id, left, -1);
  }

  // Shift everything into positive space.
  let minX = Infinity;
  let minY = Infinity;
  for (const [id, [x, y]] of centre) {
    const s = size.get(id)!;
    minX = Math.min(minX, x - s.w / 2);
    minY = Math.min(minY, y - s.h / 2);
  }
  const ox = 50 - minX;
  const oy = 40 - minY;
  for (const [id, [x, y]] of centre) placeNode(scene, doc, defs.get(id)!, x + ox, y + oy, size.get(id));

  // Branches: tapered curves from parent to child; text leaves get an underline to land on.
  for (const [id, parent] of parentOf) {
    const a = scene.nodes.get(parent);
    const b = scene.nodes.get(id);
    if (!a || !b) continue;
    const level = levelOf.get(id) ?? 1;
    const color = branchColor.get(id);
    const isText = defs.get(id)!.shape === 'text';
    let start: Pt;
    let end: Pt;
    if (down) {
      start = [a.cx, a.cy + a.h / 2 - (defs.get(parent)!.shape === 'text' ? 0 : 2)];
      end = [b.cx, b.cy - b.h / 2 - 2];
    } else {
      const side = b.cx > a.cx ? 1 : -1;
      const aText = defs.get(parent)!.shape === 'text';
      start = [a.cx + side * (a.w / 2 - (aText ? 0 : 4)), aText ? a.cy + a.labelH / 2 + 4 : a.cy];
      end = isText ? [b.cx - side * (b.w / 2), b.cy + b.labelH / 2 + 4] : [b.cx - side * (b.w / 2 - 2), b.cy];
    }
    const pts: Pt[] = [];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      // Cubic ease between the two points, leaving and arriving level.
      const c1: Pt = down ? [start[0], (start[1] + end[1]) / 2] : [(start[0] + end[0]) / 2, start[1]];
      const c2: Pt = down ? [end[0], (start[1] + end[1]) / 2] : [(start[0] + end[0]) / 2, end[1]];
      const u = 1 - t;
      pts.push([
        u * u * u * start[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * end[0],
        u * u * u * start[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * end[1],
      ]);
    }
    const w0 = level === 1 ? 7 : level === 2 ? 4 : 2.6;
    scene.decorations.push({ kind: 'branch', points: pts, w0, w1: Math.max(1.6, w0 * 0.45), color: color && INKS[color] ? color : undefined, owner: { node: id } });
    if (isText && !down) {
      const y = b.cy + b.labelH / 2 + 4;
      scene.decorations.push({ kind: 'line', points: [[b.cx - b.w / 2, y], [b.cx + b.w / 2, y]], width: 1.6, color, owner: { node: id } });
    }
  }

  // Steps: the root, then each first-level branch with everything under it.
  scene.autoSteps = { nodes: new Map([[root.id, 1]]) };
  first.forEach((c, k) => {
    const mark = (id: string) => {
      scene.autoSteps!.nodes!.set(id, k + 2);
      children(id).forEach((x) => mark(x.id));
    };
    mark(c.id);
  });
  fitScene(scene);
  return scene;
};
