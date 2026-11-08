import { overlapArea } from '../labels';
import { measure } from '../measure';
import type { Box, LayoutFn, Pt } from '../scene';
import { slug } from '../syntax/parser';
import type { NodeDef } from '../types';
import { emptyScene, fitScene, inOrder, placeNode, sizeDef, textMetrics, warn } from './shared';

/**
 * A 2×2 grid: two axes crossing in the middle, four named squares, and items
 * as dots. `at x,y` takes 0 to 1 with 0,0 at the bottom left; `in "Name"`
 * drops an item in a square. Only labels move to keep clear; dots never do.
 */
export const quadrant: LayoutFn = (doc) => {
  const scene = emptyScene(doc, 'quadrant', { tilt: 0.6, stickyTilt: 3, jitterX: 0, jitterY: 0 });
  const { px, family, weight } = textMetrics(doc);
  const items = inOrder(doc);
  const { axis, ends } = doc.chart;
  const W = 520;
  const H = 440;
  const x0 = 60;
  const y0 = 50 + (axis.y ? measure(axis.y, px, family, weight).h + 8 : 0);
  const xm = x0 + W / 2;
  const ym = y0 + H / 2;
  const P = (x: number, y: number): Pt => [x0 + x * W, y0 + (1 - y) * H];

  // Axes cross in the middle; their names sit at the far ends.
  const axisStep = { step: 1 };
  scene.decorations.push({ kind: 'line', points: [[x0 - 6, ym], [x0 + W + 10, ym]], arrow: true, width: 2, owner: axisStep });
  scene.decorations.push({ kind: 'line', points: [[xm, y0 + H + 6], [xm, y0 - 10]], arrow: true, width: 2, owner: axisStep });
  const small = px * 0.8;
  const taken: Box[] = [];
  const text = (x: number, y: number, t: string, size: number, opts: { bold?: boolean; anchor?: 'start' | 'middle'; color?: string; step?: number } = {}) => {
    const m = measure(t, size, family, opts.bold ? Math.min(700, weight + 200) : weight);
    scene.decorations.push({ kind: 'text', x, y, text: t, px: size, bold: opts.bold, anchor: opts.anchor, color: opts.color, owner: { step: opts.step ?? 1 } });
    const bx = opts.anchor === 'start' ? x : x - m.w / 2;
    taken.push({ x: bx - 4, y: y - m.h / 2 - 2, w: m.w + 8, h: m.h + 4 });
    return m;
  };
  if (axis.x) {
    const m = measure(axis.x, px, family, weight);
    text(x0 + W - m.w / 2, ym + m.h / 2 + 12, axis.x, px, { bold: true });
  }
  if (axis.y) text(xm, y0 - 18 - measure(axis.y, px, family, weight).h / 2, axis.y, px, { bold: true });
  if (ends.x) {
    text(x0 + 4, ym + 16, ends.x[0], small, { anchor: 'start', color: 'gray' });
    if (!axis.x) text(x0 + W - measure(ends.x[1], small, family, weight).w / 2, ym + 16, ends.x[1], small, { color: 'gray' });
    else text(x0 + W - measure(ends.x[1], small, family, weight).w / 2, ym - 16, ends.x[1], small, { color: 'gray' });
  }
  if (ends.y) {
    text(xm + 10, y0 + H - 6, ends.y[0], small, { anchor: 'start', color: 'gray' });
    text(xm + 10, y0 + 12, ends.y[1], small, { anchor: 'start', color: 'gray' });
  }

  // Where each item's dot goes.
  const dots = new Map<string, Pt>();
  const inSquare = new Map<number, NodeDef[]>();
  const unplaced: NodeDef[] = [];
  for (const d of items) {
    if (d.at) dots.set(d.id, P(d.at[0], d.at[1]));
    else if (d.inside) {
      const k = doc.quadrants.findIndex((q) => q === d.inside![0] || slug(q) === slug(d.inside![0]));
      if (k >= 0) inSquare.set(k, [...(inSquare.get(k) ?? []), d]);
      else unplaced.push(d);
    } else unplaced.push(d);
  }
  for (const [k, list] of inSquare) {
    const qx = k % 2 === 0 ? x0 + W / 4 : x0 + (3 * W) / 4;
    const qy = k < 2 ? y0 + H / 4 : y0 + (3 * H) / 4;
    list.forEach((d, j) => {
      const t = list.length === 1 ? 0 : j / (list.length - 1) - 0.5;
      dots.set(d.id, [qx - 30 + (j % 2) * 24, qy + 10 + t * (H / 2 - 90)]);
    });
  }
  if (unplaced.length)
    warn(scene, 'W-QUADRANT-UNPLACED', `${unplaced.map((d) => `"${d.id}"`).join(', ')} ${unplaced.length === 1 ? 'has' : 'have'} no place, so ${unplaced.length === 1 ? 'it sits' : 'they sit'} under the grid.`, 'Add  at x,y  or  in "Square"');
  // Unplaced items: rows under the grid, each dot with its label to its right.
  let ux = x0;
  let uy = y0 + H + 50;
  let rowH = 0;
  for (const d of unplaced) {
    const sz = sizeDef(doc, { ...d, shape: 'text' });
    const w = sz.w + 40;
    if (ux > x0 && ux + w > x0 + W) {
      ux = x0;
      uy += rowH + 16;
      rowH = 0;
    }
    rowH = Math.max(rowH, sz.h);
    dots.set(d.id, [ux + 6, uy + sz.h / 2]);
    ux += w;
  }

  // Square names: large and faint along the outer edge of each square, slid sideways if a dot is in the way.
  const quadOf = (p: Pt) => (p[1] < ym ? 0 : 2) + (p[0] < xm ? 0 : 1);
  const dotList = [...dots.values()];
  doc.quadrants.forEach((q, k) => {
    const size = px * 1.15;
    const m = measure(q, size, family, weight);
    const left = k % 2 === 0;
    const sq0 = left ? x0 : xm;
    const outer = left ? sq0 + 14 : sq0 + W / 2 - 14 - m.w;
    const inner = left ? sq0 + W / 2 - 30 - m.w : sq0 + 30;
    const xsTry = [outer, sq0 + W / 4 - m.w / 2, inner];
    const y = k < 2 ? y0 + 22 : y0 + H - 22;
    const clash = (x: number) => dotList.filter(([dx, dy]) => dx > x - 16 && dx < x + m.w + 16 && Math.abs(dy - y) < m.h / 2 + 14).length;
    const x = xsTry.reduce((b, c) => (clash(c) < clash(b) ? c : b));
    text(x, y, q, size, { anchor: 'start', color: 'gray', step: k + 2 });
  });

  // Labels beside their dots: the first spot that is clear, else the least crowded.
  const dotBoxes: Box[] = [...dots.values()].map(([x, y]) => ({ x: x - 6, y: y - 6, w: 12, h: 12 }));
  const axisBoxes: Box[] = [
    { x: x0, y: ym - 2, w: W, h: 4 },
    { x: xm - 2, y: y0, w: 4, h: H },
  ];
  const step = new Map<string, number>();
  for (const d of items) {
    const p = dots.get(d.id)!;
    const def: NodeDef = { ...d, shape: 'text' };
    const s = sizeDef(doc, def);
    const spots: Pt[] = [
      [p[0] + 12 + s.w / 2, p[1]],
      [p[0] - 12 - s.w / 2, p[1]],
      [p[0], p[1] - 8 - s.h / 2],
      [p[0], p[1] + 8 + s.h / 2],
      [p[0] + 12 + s.w / 2, p[1] - s.h / 2],
      [p[0] - 12 - s.w / 2, p[1] + s.h / 2],
    ];
    let best = spots[0];
    let bestCost = Infinity;
    spots.forEach((c, k) => {
      const box = { x: c[0] - s.w / 2 - 6, y: c[1] - s.h / 2 - 2, w: s.w + 12, h: s.h + 4 };
      const cost = k + [...taken, ...dotBoxes, ...axisBoxes].reduce((t, o) => t + overlapArea(box, o), 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = c;
      }
    });
    placeNode(scene, doc, def, best[0], best[1], s);
    taken.push({ x: best[0] - s.w / 2, y: best[1] - s.h / 2, w: s.w, h: s.h });
    scene.decorations.push({ kind: 'disc', cx: p[0], cy: p[1], r: 5, color: d.color, solid: true, owner: { node: d.id } });
    step.set(d.id, quadOf(p) + 2);
  }

  // Steps: the axes, then each square with its items, in reading order.
  scene.autoSteps = { nodes: step };
  fitScene(scene);
  return scene;
};
