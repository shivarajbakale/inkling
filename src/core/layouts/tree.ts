import type { LayoutFn, Pt } from '../scene';
import type { NodeDef } from '../types';
import { emptyScene, fitScene, inOrder, placeNode, sizeDef } from './shared';

/**
 * A hierarchy drawn the formal way: org charts, taxonomies, file trees. The
 * tree comes from outline bullets, or from arrows; nodes with no parent are
 * roots, and several roots make a forest side by side. Every level keeps the
 * same shape. `direction down` (default) puts children below their parent,
 * `direction right` beside it. `branches elbow` (default) draws org-chart
 * connectors; `branches straight` draws direct lines.
 */
export const tree: LayoutFn = (doc) => {
  const scene = emptyScene(doc, 'tree', { tilt: 1.2, stickyTilt: 4, jitterX: 0, jitterY: 0 });
  const nodes = inOrder(doc);
  const right = doc.direction === 'right' && doc.directionSet === true;

  // Parents: bullets first, otherwise the first arrow into each node.
  const parentOf = new Map<string, string>();
  const fromBullets = nodes.some((n) => n.bullet);
  if (fromBullets) {
    for (const n of nodes) if (n.bullet?.parent) parentOf.set(n.id, n.bullet.parent);
  } else {
    for (const e of doc.edges) if (!parentOf.has(e.to) && e.to !== e.from) parentOf.set(e.to, e.from);
  }
  // A loop can't be a tree: cut the link that closes it, and say so.
  for (const n of nodes) {
    const seen = new Set<string>([n.id]);
    let cur = parentOf.get(n.id);
    while (cur !== undefined) {
      if (seen.has(cur)) {
        const p = parentOf.get(n.id)!;
        parentOf.delete(n.id);
        const edge = doc.edges.find((e) => e.from === p && e.to === n.id);
        scene.warnings.push({
          code: 'E-TREE-CYCLE',
          severity: 'error',
          message: `A tree can't loop back: "${n.id}" is above "${p}" and below it.`,
          hint: 'Use  layout flow  or  layout state  for diagrams with loops.',
          span: edge?.span ?? n.span,
        });
        break;
      }
      seen.add(cur);
      cur = parentOf.get(cur);
    }
  }
  const kids = new Map<string, NodeDef[]>();
  for (const n of nodes) {
    const p = parentOf.get(n.id);
    if (p !== undefined) kids.set(p, [...(kids.get(p) ?? []), n]);
  }
  const children = (id: string) => kids.get(id) ?? [];
  const roots = nodes.filter((n) => !parentOf.has(n.id));

  // Arrows from parent to child are drawn as branches, unless they say more than "child of".
  const branchEdge = new Set<number>();
  for (const e of scene.edges) {
    if (parentOf.get(e.def.to) !== e.def.from) continue;
    if (e.def.label || e.def.kind !== 'solid' || e.def.both) e.style = 'arrow';
    else {
      e.style = 'hidden';
      branchEdge.add(e.index);
    }
  }

  // Level of each node, and the deepest size per level so rows line up.
  const level = new Map<string, number>();
  const walk = (id: string, l: number) => {
    level.set(id, l);
    for (const c of children(id)) walk(c.id, l + 1);
  };
  for (const r of roots) walk(r.id, 0);
  const defs = new Map(nodes.map((n) => [n.id, n]));
  const size = new Map(nodes.map((n) => [n.id, sizeDef(doc, n)]));
  const deep = (id: string) => (right ? size.get(id)!.w : size.get(id)!.h);
  const across = (id: string) => (right ? size.get(id)!.h : size.get(id)!.w);
  const levels = Math.max(0, ...level.values()) + 1;
  const levelSize = Array.from({ length: levels }, () => 0);
  for (const [id, l] of level) levelSize[l] = Math.max(levelSize[l], deep(id));
  const gapAcross = right ? 14 : 28;
  const gapDeep = right ? 56 : 62;
  const levelPos: number[] = [];
  let pos = 0;
  for (let l = 0; l < levels; l++) {
    levelPos.push(pos + levelSize[l] / 2);
    pos += levelSize[l] + gapDeep;
  }

  // Width of each subtree along the sibling axis.
  const memo = new Map<string, number>();
  const extent = (id: string): number => {
    const hit = memo.get(id);
    if (hit !== undefined) return hit;
    const cs = children(id);
    const sum = cs.reduce((t, c) => t + extent(c.id), 0) + Math.max(0, cs.length - 1) * gapAcross;
    const v = Math.max(across(id), sum);
    memo.set(id, v);
    return v;
  };

  // Children share their parent's span; the parent sits centred over them.
  const centre = new Map<string, Pt>();
  const place = (id: string, start: number) => {
    const cs = children(id);
    const total = cs.reduce((t, c) => t + extent(c.id), 0) + Math.max(0, cs.length - 1) * gapAcross;
    let cursor = start + (extent(id) - total) / 2;
    for (const c of cs) {
      place(c.id, cursor);
      cursor += extent(c.id) + gapAcross;
    }
    const a = cs.length ? (centre.get(cs[0].id)![right ? 1 : 0] + centre.get(cs[cs.length - 1].id)![right ? 1 : 0]) / 2 : start + extent(id) / 2;
    const d = levelPos[level.get(id)!];
    centre.set(id, right ? [d, a] : [a, d]);
  };
  let start = 0;
  for (const r of roots) {
    place(r.id, start);
    start += extent(r.id) + gapAcross * 2.5;
  }

  // Shift everything so the top-left edge sits at the margin.
  const margin = 40;
  let minX = Infinity;
  let minY = Infinity;
  for (const [id, [x, y]] of centre) {
    minX = Math.min(minX, x - size.get(id)!.w / 2);
    minY = Math.min(minY, y - size.get(id)!.h / 2);
  }
  for (const [id, [x, y]] of centre) placeNode(scene, doc, defs.get(id)!, x + margin - minX, y + margin - minY, size.get(id));

  // Branches: parent edge → child edge, as elbows or straight lines.
  for (const p of nodes) {
    const cs = children(p.id).filter((c) => {
      const e = scene.edges.find((x) => x.def.from === p.id && x.def.to === c.id);
      return !e || branchEdge.has(e.index);
    });
    const a = scene.nodes.get(p.id);
    if (!a || !cs.length) continue;
    const out: Pt = right ? [a.cx + a.w / 2, a.cy] : [a.cx, a.cy + a.h / 2];
    const ends = cs.map((c) => {
      const b = scene.nodes.get(c.id)!;
      return { id: c.id, end: (right ? [b.cx - b.w / 2, b.cy] : [b.cx, b.cy - b.h / 2]) as Pt };
    });
    if (doc.branches === 'straight') {
      for (const { id, end } of ends) scene.decorations.push({ kind: 'line', points: [out, end], width: 1.7, owner: { node: id } });
      continue;
    }
    // The bus runs halfway between the parent and the nearest child.
    const k = right ? 0 : 1;
    const bus = (out[k] + Math.min(...ends.map((e) => e.end[k]))) / 2;
    const at = (along: number, depth: number): Pt => (right ? [depth, along] : [along, depth]);
    const j = right ? 1 : 0;
    const trunk = at(out[j], bus);
    // The trunk draws with the first child; each child's arm runs from its neighbour nearer the trunk.
    scene.decorations.push({ kind: 'line', points: [out, trunk], width: 1.7, straight: true, owner: { node: ends[0].id } });
    const sorted = [...ends].sort((x, y) => x.end[j] - y.end[j]);
    for (let i = 0; i < sorted.length; i++) {
      const { id, end } = sorted[i];
      let from = out[j];
      if (end[j] < out[j] && i + 1 < sorted.length && sorted[i + 1].end[j] < out[j]) from = sorted[i + 1].end[j];
      if (end[j] > out[j] && i > 0 && sorted[i - 1].end[j] > out[j]) from = sorted[i - 1].end[j];
      const pts: Pt[] = Math.abs(end[j] - from) < 0.5 ? [at(end[j], bus), end] : [at(from, bus), at(end[j], bus), end];
      scene.decorations.push({ kind: 'line', points: pts, width: 1.7, straight: true, owner: { node: id } });
    }
  }

  // Side arrows between nodes on one level bow out past the row, where their label has room.
  for (const e of scene.edges) {
    if (e.style === 'hidden' || parentOf.get(e.def.to) === e.def.from) continue;
    const a = scene.nodes.get(e.def.from);
    const b = scene.nodes.get(e.def.to);
    if (!a || !b || a === b || level.get(e.def.from) !== level.get(e.def.to)) continue;
    e.route = right
      ? [[Math.max(a.cx + a.w / 2, b.cx + b.w / 2) + 34, (a.cy + b.cy) / 2]]
      : [[(a.cx + b.cx) / 2, Math.max(a.cy + a.h / 2, b.cy + b.h / 2) + 34]];
  }

  // Steps: one level at a time, top first.
  scene.autoSteps = { nodes: new Map([...level].map(([id, l]) => [id, l + 1])) };
  fitScene(scene);
  return scene;
};
