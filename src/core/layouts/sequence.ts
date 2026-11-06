import { wrapText } from '../labels';
import { measure } from '../measure';
import type { LayoutFn, Pt } from '../scene';
import { emptyScene, fitScene, inOrder, placeNode, sizeDef, textMetrics } from './shared';

/**
 * Who talks to whom, in order. Participants are nodes, left to right as
 * written, each with a lifeline. Arrows are messages, top to bottom in source
 * order; notes sit at the row where they are written. `activate x` and
 * `deactivate x` draw a narrow box on x's lifeline.
 */
export const sequence: LayoutFn = (doc) => {
  const scene = emptyScene(doc, 'sequence', { tilt: 0.8, stickyTilt: 3, jitterX: 0, jitterY: 0 });
  const { px, family, weight } = textMetrics(doc);
  const people = inOrder(doc);
  const sizes = people.map((d) => sizeDef(doc, d));
  const index = new Map(people.map((d, k) => [d.id, k]));
  const labelPx = px * 0.82;

  // Columns: far enough apart for the boxes and for every message label between them.
  const xs: number[] = [];
  people.forEach((_, k) => {
    if (k === 0) xs.push(50 + sizes[0].w / 2);
    else xs.push(xs[k - 1] + Math.max(sizes[k - 1].w / 2 + sizes[k].w / 2 + 40, 130));
  });
  for (let pass = 0; pass < 3; pass++)
    for (const e of doc.edges) {
      const a = index.get(e.from)!;
      const b = index.get(e.to)!;
      if (a === b || !e.label) continue;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const need = measure(e.label, labelPx, family, weight).w + 36;
      const have = xs[hi] - xs[lo];
      if (have < need) for (let k = hi; k < xs.length; k++) xs[k] += need - have;
    }
  const headerH = Math.max(0, ...sizes.map((s) => s.h));
  const top = 30 + headerH / 2;
  people.forEach((d, k) => placeNode(scene, doc, d, xs[k], top));

  // Rows, in source order: messages, notes and activations.
  type Row = { kind: 'edge'; i: number } | { kind: 'note'; i: number } | { kind: 'act'; i: number };
  const rows: { order: number; row: Row }[] = [
    ...doc.edges.map((e, i) => ({ order: e.order, row: { kind: 'edge' as const, i } })),
    ...doc.annotations.map((a, i) => ({ order: a.order, row: { kind: 'note' as const, i } })).filter((r) => doc.annotations[r.row.i].kind === 'note'),
    ...doc.activations.map((a, i) => ({ order: a.order, row: { kind: 'act' as const, i } })),
  ].sort((a, b) => a.order - b.order);

  let y = 30 + headerH + 30;
  const edgeStep = new Map<number, number>();
  const markStep = new Map<number, number>();
  const active = new Map<string, number>();
  let step = 1;
  let lastY = y;
  for (const { row } of rows) {
    if (row.kind === 'edge') {
      const e = doc.edges[row.i];
      const a = index.get(e.from)!;
      const b = index.get(e.to)!;
      const lh = e.label ? measure(e.label, labelPx, family, weight).h : 0;
      y += lh + 12;
      const sceneEdge = scene.edges[row.i];
      if (a === b) {
        const x = xs[a];
        sceneEdge.points = [
          [x + 4, y],
          [x + 46, y],
          [x + 46, y + 22],
          [x + 8, y + 22],
        ];
        y += 22;
      } else {
        const dir = b > a ? 1 : -1;
        sceneEdge.points = [
          [xs[a] + dir * 4, y],
          [xs[b] - dir * 8, y],
        ];
      }
      sceneEdge.fixed = true;
      // Labels above the line.
      sceneEdge.bend = b >= a ? -20 : 20;
      step++;
      edgeStep.set(row.i, step);
      y += 22;
    } else if (row.kind === 'note') {
      const a = doc.annotations[row.i];
      const k = index.get(a.target);
      if (k === undefined || !a.text) continue;
      const text = wrapText(a.text);
      const m = measure(text, px * 0.86, family, weight);
      y += 6;
      scene.labels.set(`note:${row.i}`, { key: `note:${row.i}`, text, px: px * 0.86, box: { x: xs[k] + 30, y, w: m.w, h: m.h }, anchor: [xs[k] + 5, y + m.h / 2] });
      markStep.set(row.i, step);
      y += m.h + 14;
    } else {
      const act = doc.activations[row.i];
      if (act.on) active.set(act.id, y);
      else {
        const from = active.get(act.id);
        if (from !== undefined) {
          const x = xs[index.get(act.id)!];
          scene.decorations.push({ kind: 'box', box: { x: x - 7, y: from, w: 14, h: Math.max(16, y - from) }, fill: 'rgba(127,127,127,0.18)', owner: { node: act.id } });
          active.delete(act.id);
        }
      }
    }
    lastY = y;
  }
  const bottom = lastY + 26;
  for (const [id, from] of active) {
    const x = xs[index.get(id)!];
    scene.decorations.push({ kind: 'box', box: { x: x - 7, y: from, w: 14, h: Math.max(16, bottom - 10 - from) }, fill: 'rgba(127,127,127,0.18)', owner: { node: id } });
  }

  // Lifelines, drawn first so boxes and messages sit on top.
  people.forEach((d, k) => {
    const lines: Pt[] = [
      [xs[k], top + sizes[k].h / 2 + 4],
      [xs[k], bottom],
    ];
    scene.decorations.unshift({ kind: 'line', points: lines, dashed: true, width: 1.2, owner: { node: d.id } });
  });

  // Long conversations repeat the participants at the bottom.
  if (doc.footer && doc.edges.length > 8) {
    people.forEach((d, k) => {
      const s = sizes[k];
      scene.decorations.push({ kind: 'box', box: { x: xs[k] - s.w / 2, y: bottom + 6, w: s.w, h: Math.min(s.h, 44) }, owner: { node: d.id } });
      scene.decorations.push({ kind: 'text', x: xs[k], y: bottom + 6 + Math.min(s.h, 44) / 2, text: d.label, px, owner: { node: d.id } });
    });
  }

  // Steps: everyone appears first, then one message per step.
  scene.autoSteps = { nodes: new Map(people.map((d) => [d.id, 1])), edges: edgeStep, marks: markStep };
  fitScene(scene);
  return scene;
};
