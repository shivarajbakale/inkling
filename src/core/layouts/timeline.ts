import { measure } from '../measure';
import type { LayoutFn, Pt } from '../scene';
import type { NodeDef } from '../types';
import { emptyScene, fitScene, inOrder, placeNode, sizeDef, textMetrics } from './shared';

/** A date as a number, if it is one: a year, a decimal, or an ISO date. */
function dateValue(d: string | undefined): number | undefined {
  if (!d) return undefined;
  const t = d.trim();
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (/^\d{4}-\d{2}(-\d{2})?/.test(t)) {
    const ms = Date.parse(t.length === 7 ? `${t}-01` : t);
    if (!Number.isNaN(ms)) return ms / 86400000 / 365.25 + 1970;
  }
  return undefined;
}

/**
 * Events along one hand-drawn axis. Bullets are `- date: text`. When every
 * date is a number or an ISO date, events are spaced to scale, and very long
 * gaps are shortened and marked with a zig-zag. Text alternates above and
 * below the axis (or left and right with `direction down`).
 */
export const timeline: LayoutFn = (doc) => {
  const scene = emptyScene(doc, 'timeline', { tilt: 1.2, stickyTilt: 4, jitterX: 0, jitterY: 3 });
  const { px, family, weight } = textMetrics(doc);
  const vertical = doc.direction === 'down' && doc.directionSet === true;
  const events = inOrder(doc).filter((n) => !n.bullet || n.bullet.level === 0);
  const asEvent = (d: NodeDef): NodeDef => (d.implicit || d.shape === 'box' ? { ...d, shape: 'round' } : d);
  const defs = events.map(asEvent);
  const sizes = defs.map((d) => sizeDef(doc, d));

  // Positions along the axis.
  const values = events.map((e) => dateValue(e.date));
  const scaled = values.length > 1 && values.every((v) => v !== undefined);
  const order = events.map((_, k) => k);
  if (scaled) order.sort((a, b) => values[a]! - values[b]!);
  const along: number[] = new Array(events.length).fill(0);
  const breaks: number[] = [];
  const minGap = (k: number) => {
    // Neighbours sit on opposite sides, so they only need to clear each other's half-widths on the same side.
    const a = sizes[order[k - 1]];
    const b = sizes[order[k]];
    const same = k >= 2 ? sizes[order[k - 2]] : undefined;
    const side = vertical ? Math.max(a.h, b.h) * 0.6 + 26 : Math.max(60, (a.w + b.w) / 4 + 24);
    const twoBack = same ? (vertical ? (same.h + b.h) / 2 + 20 : (same.w + b.w) / 2 + 24) : 0;
    return { side, twoBack };
  };
  if (scaled) {
    const gaps = order.slice(1).map((k, i) => values[k]! - values[order[i]]!);
    const sorted = [...gaps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 1;
    const unit = 120 / median;
    order.forEach((k, i) => {
      if (i === 0) return;
      const raw = gaps[i - 1];
      const capped = raw > median * 3 ? median * 3 : raw;
      if (raw > median * 3) breaks.push(i);
      const { side, twoBack } = minGap(i);
      let pos = along[order[i - 1]] + Math.max(side, capped * unit);
      if (i >= 2) pos = Math.max(pos, along[order[i - 2]] + twoBack);
      along[k] = pos;
    });
  } else {
    order.forEach((k, i) => {
      if (i === 0) return;
      const { side, twoBack } = minGap(i);
      let pos = along[order[i - 1]] + Math.max(side, 110);
      if (i >= 2) pos = Math.max(pos, along[order[i - 2]] + twoBack);
      along[k] = pos;
    });
  }

  // Lay it out: axis at a fixed line, text alternating sides with a connector.
  const reach = 46;
  const maxAcross = Math.max(0, ...sizes.map((s) => (vertical ? s.w : s.h)));
  const axis = 40 + reach + maxAcross + 10 + (vertical ? 60 : 0);
  const start = 70 + (vertical ? 0 : Math.max(0, ...sizes.map((s) => s.w)) / 2);
  const P = (a: number, c: number): Pt => (vertical ? [c, a] : [a, c]);
  order.forEach((k, i) => {
    const s = sizes[k];
    const side = i % 2 === 0 ? -1 : 1;
    const a = start + along[k];
    const across = axis + side * (reach + (vertical ? s.w : s.h) / 2);
    const [cx, cy] = P(a, across);
    placeNode(scene, doc, defs[k], cx, cy);
    const id = events[k].id;
    const edge = vertical ? s.w / 2 : s.h / 2;
    scene.decorations.push({ kind: 'line', points: [P(a, axis + side * 4), P(a, across - side * edge - side * 2)], width: 1.2, owner: { node: id } });
    scene.decorations.push({ kind: 'line', points: [P(a, axis - 7), P(a, axis + 7)], width: 2, owner: { node: id } });
    if (events[k].date) {
      // The date sits on the other side of the axis from its event.
      const dpx = px * 0.78;
      const dw = measure(events[k].date!, dpx, family, Math.min(700, weight + 200)).w;
      const [tx, ty] = vertical ? [axis - side * (14 + dw / 2), a] : [a, axis - side * 16];
      scene.decorations.push({ kind: 'text', x: tx, y: ty, text: events[k].date!, px: dpx, bold: true, color: 'mark', owner: { node: id } });
    }
  });
  const last = start + Math.max(0, ...along);
  scene.decorations.unshift({ kind: 'line', points: [P(start - 50, axis), P(last + 70, axis)], arrow: true, width: 2 });
  for (const i of breaks) {
    const mid = start + (along[order[i]] + along[order[i - 1]]) / 2;
    scene.decorations.push({ kind: 'zigzag', at: P(mid, axis), vertical });
  }

  // Spans: a bracket along the axis on the far side, with its label.
  const far = axis + reach + maxAcross + 30;
  doc.ranges
    .filter((r) => r.kind === 'span')
    .forEach((r, j) => {
      const ka = events.findIndex((e) => e.id === r.from);
      const kb = events.findIndex((e) => e.id === r.to);
      if (ka < 0 || kb < 0) return;
      const a1 = start + Math.min(along[ka], along[kb]) - 10;
      const a2 = start + Math.max(along[ka], along[kb]) + 10;
      const c = far + j * 46;
      scene.decorations.push({ kind: 'brace', from: P(a1, c), to: P(a2, c), toward: P((a1 + a2) / 2, c + 30), owner: { node: r.to } });
      if (r.label) {
        const [tx, ty] = vertical ? [c + 30, (a1 + a2) / 2] : [(a1 + a2) / 2, c + 34];
        scene.decorations.push({ kind: 'text', x: tx, y: ty, text: r.label, px: px * 0.9, anchor: vertical ? 'start' : 'middle', owner: { node: r.to } });
      }
    });

  scene.autoSteps = { nodes: new Map(order.map((k, i) => [events[k].id, i + 1])) };
  // Anything that is not an event (a stray node) sits after the axis.
  const rest = inOrder(doc).filter((n) => !events.includes(n));
  if (rest.length) {
    fitScene(scene, 0);
    const below = scene.height + 60;
    let x = 40;
    for (const d of rest) {
      const s = sizeDef(doc, d);
      placeNode(scene, doc, d, x + s.w / 2, below + s.h / 2);
      x += s.w + 40;
    }
  }
  fitScene(scene);
  return scene;
};
