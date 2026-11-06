import type { LayoutFn, Pt } from '../scene';
import type { NodeDef } from '../types';
import { emptyScene, fitScene, placeNode, sizeDef, textMetrics, warn } from './shared';

/**
 * X versus Y: `columns` headings and `row` lines. Headings are underlined,
 * rows are separated by hand-drawn rules, columns by a wobbly divider; no
 * full grid. With exactly two columns a circled "vs" sits between them.
 * `direction down` swaps rows and columns.
 */
export const compare: LayoutFn = (doc) => {
  const scene = emptyScene(doc, 'compare', { tilt: 0.6, stickyTilt: 3, jitterX: 0, jitterY: 0 });
  const { px } = textMetrics(doc);
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const cols = doc.columns.map((id) => byId.get(id)!).filter(Boolean);
  const rows = doc.rows.map((id) => byId.get(id)!).filter(Boolean);
  if (!cols.length) {
    warn(scene, 'W-NO-COLUMNS', 'A compare layout needs a  columns "A", "B"  line.');
    fitScene(scene);
    return scene;
  }
  const transpose = doc.direction === 'down' && doc.directionSet === true;
  const heading = (d: NodeDef): NodeDef => ({ ...d, size: d.size ?? 'large' });
  const cell = (r: NodeDef, c: NodeDef) => byId.get(`${r.id}.${c.id}`);

  // Grid: index 0 on each axis is the header line; the rest are rows and columns.
  // In normal orientation, grid columns = [row labels, ...columns]; grid rows = [headings, ...rows].
  const gx = transpose ? rows.length + 1 : cols.length + 1;
  const gy = transpose ? cols.length + 1 : rows.length + 1;
  const at = (i: number, j: number): NodeDef | undefined => {
    // i: grid column, j: grid row
    const [ci, rj] = transpose ? [j, i] : [i, j];
    if (ci === 0 && rj === 0) return undefined;
    if (rj === 0) return heading(cols[ci - 1]);
    if (ci === 0) return rows[rj - 1];
    const c = cell(rows[rj - 1], cols[ci - 1]);
    return c;
  };
  const sizeOf = (d: NodeDef | undefined) => (d ? sizeDef(doc, d.cell?.mark && !d.label ? { ...d, label: 'Mm' } : d) : { w: 0, h: 0, lw: 0, lh: 0, labelDy: 0 });
  const widths = Array.from({ length: gx }, (_, i) => Math.max(40, ...Array.from({ length: gy }, (_, j) => sizeOf(at(i, j)).w)) + 30);
  const heights = Array.from({ length: gy }, (_, j) => Math.max(30, ...Array.from({ length: gx }, (_, i) => sizeOf(at(i, j)).h)) + 22);
  const xs: number[] = [40];
  widths.forEach((w, i) => xs.push(xs[i] + w));
  const ys: number[] = [30];
  heights.forEach((h, j) => ys.push(ys[j] + h));

  for (let i = 0; i < gx; i++)
    for (let j = 0; j < gy; j++) {
      const d = at(i, j);
      if (!d) continue;
      const s = sizeOf(d);
      placeNode(scene, doc, d, (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2, d.cell?.mark && !d.label ? { w: 34, h: 30, lw: 0, lh: 0 } : { w: s.w, h: s.h });
    }

  // Underline the headings; rules between rows; dividers between columns.
  const left = xs[0];
  const right = xs[gx];
  const top = ys[0];
  const bottom = ys[gy];
  const headerIds = cols.map((c) => c.id);
  for (const id of headerIds) {
    const n = scene.nodes.get(id)!;
    const y = n.cy + n.labelH / 2 + 4;
    scene.decorations.push({ kind: 'line', points: [[n.cx - n.labelW / 2 - 4, y], [n.cx + n.labelW / 2 + 8, y - 2]], width: 2, color: 'mark', owner: { node: id } });
  }
  const ruleOwner = (k: number) => ({ node: (transpose ? cols : rows)[k - 1]?.id });
  for (let j = 1; j < gy; j++) {
    const y = ys[j];
    const p: Pt[] = transpose ? [[xs[1] - 10, y], [right, y + 1]] : [[left, y], [right, y + 1]];
    scene.decorations.push({ kind: 'line', points: p, width: j === 1 ? 1.8 : 1, owner: j === 1 ? { node: headerIds[0] } : ruleOwner(j) });
  }
  for (let i = 2; i < gx; i++) {
    const x = xs[i];
    scene.decorations.push({ kind: 'line', points: [[x, top + 8], [x + 2, bottom - 6]], width: 1.2, smooth: true, owner: { node: headerIds[0] } });
  }
  if (!transpose && cols.length === 2) {
    const x = xs[2];
    const y = (ys[0] + ys[1]) / 2;
    scene.decorations.push({ kind: 'text', x, y, text: 'vs', px: px * 0.9, bold: true, color: 'mark', owner: { node: headerIds[1] } });
    scene.decorations.push({ kind: 'ring', cx: x, cy: y, rx: 18, ry: 14, color: 'mark', owner: { node: headerIds[1] } });
  }

  // Steps: the headings, then one row per step.
  scene.autoSteps = { nodes: new Map() };
  for (const c of cols) scene.autoSteps.nodes!.set(c.id, 1);
  rows.forEach((r, k) => {
    scene.autoSteps!.nodes!.set(r.id, k + 2);
    for (const c of cols) scene.autoSteps!.nodes!.set(`${r.id}.${c.id}`, k + 2);
  });
  fitScene(scene);
  return scene;
};
