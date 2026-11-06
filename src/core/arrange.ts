import { measure } from './measure';
import { decorationBox, shiftDecoration, type Box, type Scene, type SceneNode } from './scene';
import type { AnnotationDef, Doc } from './types';

/** Moves everything in the scene by (dx, dy). */
export function shiftScene(scene: Scene, dx: number, dy: number) {
  if (!dx && !dy) return;
  for (const n of scene.nodes.values()) {
    n.cx += dx;
    n.cy += dy;
  }
  for (const e of scene.edges) {
    e.route = e.route.map(([x, y]) => [x + dx, y + dy]);
    if (e.fixed) e.points = e.points.map(([x, y]) => [x + dx, y + dy]);
  }
  scene.decorations = scene.decorations.map((d) => shiftDecoration(d, dx, dy));
  for (const l of scene.labels.values()) {
    l.box = { ...l.box, x: l.box.x + dx, y: l.box.y + dy };
    if (l.anchor) l.anchor = [l.anchor[0] + dx, l.anchor[1] + dy];
  }
  for (const g of scene.groups) {
    g.box = { ...g.box, x: g.box.x + dx, y: g.box.y + dy };
    g.tab = { ...g.tab, x: g.tab.x + dx, y: g.tab.y + dy };
  }
}

export const nodeBox = (n: SceneNode, pad = 0): Box => ({ x: n.cx - n.w / 2 - pad, y: n.cy - n.h / 2 - pad, w: n.w + pad * 2, h: n.h + pad * 2 });

function union(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: r - x, h: bottom - y };
}

export const GROUP_PAD = 14;

/** Draws a frame around each group's members, with room for its name. Inner groups first. */
export function fitGroups(scene: Scene, doc: Doc) {
  const px = scene.fontPx * 0.8;
  const weight = Math.min(700, scene.weight + 200);
  const depth = (id: string) => (doc.groups.find((g) => g.id === id)?.parent ? 1 : 0);
  const ordered = [...doc.groups].sort((a, b) => depth(b.id) - depth(a.id));
  const done = new Map<string, Box>();
  for (const def of ordered) {
    const parts: Box[] = def.members.map((id) => scene.nodes.get(id)).filter((n): n is SceneNode => !!n).map((n) => nodeBox(n));
    for (const child of doc.groups.filter((c) => c.parent === def.id)) {
      const b = done.get(child.id);
      if (b) parts.push(b);
    }
    if (!parts.length) continue;
    const inner = union(parts);
    const m = measure(def.label, px, scene.family, weight);
    const tabH = m.h + 4;
    let box: Box = {
      x: inner.x - GROUP_PAD,
      y: inner.y - GROUP_PAD - tabH - 2,
      w: inner.w + GROUP_PAD * 2,
      h: inner.h + GROUP_PAD * 2 + tabH + 2,
    };
    if (box.w < m.w + 28) box = { ...box, x: box.x - (m.w + 28 - box.w) / 2, w: m.w + 28 };
    const tab: Box = { x: box.x + 12, y: box.y + 6, w: m.w, h: m.h };
    done.set(def.id, box);
    scene.groups.push({ def, box, tab });
  }
  // Outer frames are drawn first, so they sit underneath.
  scene.groups.sort((a, b) => depth(a.def.id) - depth(b.def.id));
}

/** Keeps everything at least `margin` from the top-left, and grows the canvas to fit. */
export function normalize(scene: Scene, margin = 30) {
  const boxes = [
    ...[...scene.nodes.values()].map((n) => nodeBox(n)),
    ...scene.groups.map((g) => g.box),
    ...scene.decorations.map(decorationBox).filter((b): b is Box => !!b),
    ...[...scene.labels.values()].map((l) => l.box),
  ];
  if (!boxes.length) return;
  const all = union(boxes);
  const dx = all.x < margin ? margin - all.x : 0;
  const dy = all.y < margin ? margin - all.y : 0;
  shiftScene(scene, dx, dy);
  scene.width = Math.max(scene.width + dx, all.x + all.w + dx + margin);
  scene.height = Math.max(scene.height + dy, all.y + all.h + dy + margin);
}

/** Makes room for the title above everything and records where it goes. */
export function applyTitle(scene: Scene, doc: Doc) {
  if (!doc.title) return;
  const tp = scene.fontPx * 1.55;
  const { w } = measure(doc.title, tp, scene.family, Math.min(700, scene.weight + 200));
  scene.width = Math.max(scene.width, w + 60);
  shiftScene(scene, 0, scene.titleH);
  scene.height += scene.titleH;
  const cx = scene.width / 2;
  const cy = 22 + tp / 2;
  scene.titleBox = { x: cx - w / 2 - 10, y: cy - tp / 2 - 4, w: w + 24, h: tp + 14 };
}

/**
 * The region a mark points at, shaped like a node so marks can treat nodes,
 * groups and arrows alike.
 */
export function markTarget(scene: Scene, a: AnnotationDef): SceneNode | undefined {
  if (a.targetKind === 'node') return scene.nodes.get(a.target);
  const fake = (box: Box, label: Box, text: string): SceneNode => ({
    def: { id: a.target, shape: 'box', label: text, line: a.line, span: a.span, order: a.order },
    cx: box.x + box.w / 2,
    cy: box.y + box.h / 2,
    w: box.w,
    h: box.h,
    rotate: 0,
    labelDy: label.y + label.h / 2 - (box.y + box.h / 2),
    labelW: label.w,
    labelH: label.h,
  });
  if (a.targetKind === 'group') {
    const g = scene.groups.find((x) => x.def.id === a.target);
    return g ? fake(g.box, g.tab, g.def.label) : undefined;
  }
  const e = scene.edges[a.edgeIndex ?? -1];
  if (!e) return undefined;
  const placed = scene.labels.get(`edge:${e.index}`);
  if (placed) return fake(placed.box, placed.box, placed.text);
  const mid = midpoint(e.points);
  const box = { x: mid[0] - 9, y: mid[1] - 9, w: 18, h: 18 };
  return fake(box, box, '');
}

export function midpoint(pts: [number, number][]): [number, number] {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + seg >= total / 2) {
      const t = seg ? (total / 2 - acc) / seg : 0;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
    }
    acc += seg;
  }
  return pts[0];
}
